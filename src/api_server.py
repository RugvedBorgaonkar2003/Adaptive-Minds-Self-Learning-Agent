import sys
import os
import warnings

# Suppress harmless RuntimeWarning from google-genai SDK:
# "coroutine 'AsyncClient.aclose' was never awaited" fires when the
# async HTTP client is garbage-collected after the event loop closes.
warnings.filterwarnings("ignore", message="coroutine 'AsyncClient.aclose' was never awaited")

if sys.platform == "win32":
    import asyncio
    # Forcefully prevent anything from setting SelectorEventLoopPolicy
    asyncio.WindowsSelectorEventLoopPolicy = asyncio.WindowsProactorEventLoopPolicy
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from fastapi import FastAPI, Form, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
import uuid
import asyncio
from datetime import datetime

from src.orchestrator import KnowledgeOrchestrator
from src.processor import DocumentProcessor
from src.vector_db import VectorDBManager
from src.curriculum_gen import CurriculumGenerator
from src.tutor_graph import tutor_graph
from langchain_core.messages import HumanMessage, AIMessage
from src.flashcard_gen import FlashcardGenerator
from src.test_gen import ModuleTestGenerator
from src.notes_gen import NotesGenerator
from src.report_gen import ReportGenerator
from src.student_profile import StudentProfileManager

app = FastAPI(title="Adaptive Minds API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    session_id: str
    user_input: str
    curriculum: dict
    current_module_index: int
    current_concept_index: int

class FlashcardRequest(BaseModel):
    concept: str

class TestGenerateRequest(BaseModel):
    module_title: str
    concepts: List[str]

class ModuleCompleteRequest(BaseModel):
    session_id: str
    curriculum: dict
    current_module_index: int
    score: int
    failed_attempts: int

@app.get("/api/debug_loop")
async def debug_loop():
    loop = asyncio.get_running_loop()
    return {"loop_type": str(type(loop))}

@app.post("/api/login")
async def login(request: LoginRequest):
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Missing email or password")
    
    return {
        "status": "success",
        "message": "Login successful. Redirecting to onboarding...",
        "user": request.email
    }

# Global structured in-memory job store
job_store = {}

async def cleanup_job(job_id: str, delay_seconds: int = 300):
    """Wait for a delay, then gracefully clean up the job resources from memory. Default 5 mins."""
    await asyncio.sleep(delay_seconds)
    if job_id in job_store:
        print(f"Cleaning up resources for job: {job_id}")
        del job_store[job_id]

async def _execute_agent_pipeline_async(job_id: str, topic: str, level: str, goal_type: str, sources: List[str]):
    print(f"\n[Job {job_id}] Phase 1.5: Acquiring Knowledge...")
    job_store[job_id]['status'] = 'running'
    job_store[job_id]['message'] = 'Acquiring knowledge from sources...'
    
    def log_url(url: str):
        if job_id in job_store:
            job_store[job_id]['extracted_urls'].append(url)
    
    try:
        orchestrator = KnowledgeOrchestrator()
        structured_knowledge_base = await orchestrator.run(topic, level, sources, extracted_callback=log_url)
        
        job_store[job_id]['message'] = 'Processing and chunking knowledge...'
        
        verified_chunks = sum(1 for entry in structured_knowledge_base if entry['status'] == 'passed')
        rejected_chunks = len(structured_knowledge_base) - verified_chunks
        print(f"[Job {job_id}] Verified chunks: {verified_chunks}, Rejected: {rejected_chunks}")
        
        if verified_chunks > 0:
            processor = DocumentProcessor()
            chunks = processor.process_knowledge_base(structured_knowledge_base)
            
            if chunks:
                job_store[job_id]['message'] = 'Saving to Vector Database...'
                db = VectorDBManager()
                success = db.insert_chunks(chunks)
                
                if success:
                    job_store[job_id]['message'] = 'Building Curriculum...'
                    generator = CurriculumGenerator(db)
                    curriculum = generator.generate_curriculum(topic, level, goal_type)
                    
                    job_store[job_id]['status'] = 'completed'
                    job_store[job_id]['message'] = 'Curriculum Ready!'
                    job_store[job_id]['curriculum'] = curriculum
                    
                    print(f"[Job {job_id}] Success: Curriculum generated.")
                    
                    # Schedule memory cleanup
                    asyncio.create_task(cleanup_job(job_id))
                    return
                else:
                    raise Exception("Failed to save chunks to Vector DB.")
            else:
                raise Exception("Document processor yielded 0 chunks.")
        else:
            raise Exception("No valid sources found to build curriculum.")
            
    except Exception as e:
        print(f"[Job {job_id}] Error: {str(e)}")
        job_store[job_id]['status'] = 'failed'
        job_store[job_id]['message'] = str(e)
        # Schedule memory cleanup for failed jobs too
        asyncio.create_task(cleanup_job(job_id))

def execute_agent_pipeline_sync(*args, **kwargs):
    # This runs in a background thread via FastAPI. We set up an isolated compatible event loop.
    if sys.platform == "win32":
        loop = asyncio.ProactorEventLoop()
    else:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_execute_agent_pipeline_async(*args, **kwargs))
    finally:
        loop.close()

@app.post("/api/onboard")
async def process_onboarding(
    background_tasks: BackgroundTasks,
    topic: str = Form(...),
    level: str = Form(...),
    reason: str = Form(...),
    source_method: str = Form(...),
    files: Optional[List[UploadFile]] = File(None)
):
    saved_files = []
    
    if files:
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            if not file.filename:
                continue
                
            content = await file.read()
            if len(content) > 20 * 1024 * 1024:
                raise HTTPException(status_code=413, detail=f"File {file.filename} is too large. Max size is 20MB.")
            
            await file.seek(0)
            file_location = os.path.join(upload_dir, file.filename)
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_files.append(file_location)
            
    job_id = str(uuid.uuid4())
    job_store[job_id] = {
        'status': 'pending',
        'message': 'Job queued successfully.',
        'created_at': datetime.now().isoformat(),
        'extracted_urls': [],
        'curriculum': None
    }
    
    background_tasks.add_task(execute_agent_pipeline_sync, job_id, topic, level, reason, saved_files)
    
    return {
        "status": "success",
        "job_id": job_id,
        "message": "Onboarding pipeline started."
    }

@app.get("/api/onboard/status/{job_id}")
async def get_onboarding_status(job_id: str):
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found or already cleaned up.")
    return job_store[job_id]

@app.post("/api/chat")
async def process_chat(request: ChatRequest):
    config = {"configurable": {"thread_id": request.session_id}}
    
    current_state = tutor_graph.get_state(config)
    
    if current_state is None or not current_state.values:
        initial_state = {
            "curriculum": request.curriculum,
            "current_module_index": request.current_module_index,
            "current_concept_index": request.current_concept_index,
            "current_context": "",
            "messages": [HumanMessage(content="Hello, I am ready to begin my lessons.", name="system_init")],
            "is_testing_mode": False,
            "latest_score": 0,
            "failed_attempts": 0,
            "course_complete": False
        }
        if request.user_input:
            initial_state["messages"].append(HumanMessage(content=request.user_input))
            
        new_state = tutor_graph.invoke(initial_state, config=config)
    else:
        state_update = {}
        old_mod = current_state.values.get("current_module_index", 0)
        old_con = current_state.values.get("current_concept_index", 0)
        
        if request.current_module_index != old_mod or request.current_concept_index != old_con:
            state_update["current_module_index"] = request.current_module_index
            state_update["current_concept_index"] = request.current_concept_index
            state_update["is_testing_mode"] = False
            # Pass user intent cleanly
            text = request.user_input if request.user_input else "Let's learn this topic now."
            state_update["messages"] = [HumanMessage(content=f"[Jumping to new topic] {text}")]
        else:
            if request.user_input:
                state_update["messages"] = [HumanMessage(content=request.user_input)]
            
        new_state = tutor_graph.invoke(state_update, config=config)
        
    messages = new_state.get("messages", [])
    ai_message = ""
    for msg in reversed(messages):
        if msg.type == "ai":
            ai_message = msg.content
            break
            
    return {
        "status": "success",
        "ai_response": ai_message,
        "current_module_index": new_state.get("current_module_index"),
        "current_concept_index": new_state.get("current_concept_index"),
        "is_testing_mode": new_state.get("is_testing_mode"),
        "course_complete": new_state.get("course_complete")
    }

@app.get("/api/notes/{module_title}")
async def get_notes(module_title: str):
    import re
    notes_dir = "./data/notes"
    if not os.path.exists(notes_dir):
        return {"status": "error", "message": "No notes found yet."}
        
    safe_name = re.sub(r'[^\w\s-]', '', module_title).strip().lower().replace(" ", "_")[:60]
    
    files = []
    for f in os.listdir(notes_dir):
        if f.startswith(safe_name) and f.endswith(".md"):
            files.append(f)
            
    if not files:
        return {"status": "error", "message": f"Notes for '{module_title}' not found."}
        
    # Sort to get the latest (timestamp is at the end)
    files.sort(reverse=True)
    latest_file = files[0]
    
    with open(os.path.join(notes_dir, latest_file), "r", encoding="utf-8") as f:
        content = f.read()
        
    return {"status": "success", "content": content}

@app.get("/api/reports/{module_title}")
async def get_report(module_title: str):
    import re
    reports_dir = "./data/reports"
    if not os.path.exists(reports_dir):
        return {"status": "error", "message": "No reports found yet."}
        
    safe_name = re.sub(r'[^\w\s-]', '', module_title).strip().lower().replace(" ", "_")[:60]
    
    files = []
    for f in os.listdir(reports_dir):
        if f.startswith(safe_name) and f.endswith(".json"):
            files.append(f)
            
    if not files:
        return {"status": "error", "message": f"Report for '{module_title}' not found."}
        
    files.sort(reverse=True)
    latest_file = files[0]
    
    import json
    with open(os.path.join(reports_dir, latest_file), "r", encoding="utf-8") as f:
        data = json.load(f)
        
    return {"status": "success", "report": data}

@app.post("/api/flashcards")
async def generate_flashcards(request: FlashcardRequest):
    try:
        flash_gen = FlashcardGenerator()
        cards = flash_gen.generate(concept=request.concept, num_cards=5)
        return {"status": "success", "cards": cards}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/test/generate")
async def generate_module_test(request: TestGenerateRequest):
    try:
        test_gen = ModuleTestGenerator()
        test_data = test_gen.generate_test(request.module_title, request.concepts)
        return {"status": "success", "test": test_data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/module/complete")
async def complete_module(request: ModuleCompleteRequest):
    config = {"configurable": {"thread_id": request.session_id}}
    current_state = tutor_graph.get_state(config)
    messages = current_state.values.get("messages", []) if current_state else []
    
    curriculum = request.curriculum
    mod_idx = request.current_module_index
    modules = curriculum.get("modules", [])
    
    if mod_idx >= len(modules):
        return {"status": "error", "message": "Invalid module index"}
        
    current_module = modules[mod_idx]
    
    # 1. Update Profile
    profile_db = StudentProfileManager()
    profile_db.record_module_completion(module=current_module, score=request.score, failed_attempts=request.failed_attempts)
    
    # 2. Notes
    notes_path = None
    try:
        notes_gen = NotesGenerator()
        notes_path = notes_gen.generate(module=current_module, topic=curriculum.get("topic", ""), level=curriculum.get("level", "Beginner"))
    except Exception as e:
        print(f"Notes generation failed: {e}")
        
    # 3. Report
    report_path = None
    try:
        report_gen = ReportGenerator()
        report_path = report_gen.generate(
            module=current_module, module_number=mod_idx + 1, curriculum=curriculum,
            score=request.score, failed_attempts=request.failed_attempts, messages=messages
        )
    except Exception as e:
        print(f"Report generation failed: {e}")
        
    # 4. Advance Graph State
    next_mod_idx = mod_idx + 1
    state_update = {
        "current_module_index": next_mod_idx,
        "current_concept_index": 0,
        "is_testing_mode": False,
        "failed_attempts": 0,
        "messages": [AIMessage(content=f"🎉 Phenomenal work! You passed the module test! I've automatically compiled your chapter notes and mastery report. Let's start Module {next_mod_idx + 1}!", name="module_passed")]
    }
    
    # Invoke to save state
    tutor_graph.invoke(state_update, config=config)
    
    return {
        "status": "success",
        "next_module_index": next_mod_idx,
        "notes_path": notes_path,
        "report_path": report_path
    }

if __name__ == "__main__":
    print("Starting FastAPI server on http://localhost:8000")
    uvicorn.run("src.api_server:app", host="0.0.0.0", port=8000, reload=True)
