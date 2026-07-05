from typing import TypedDict, List, Dict, Any, Annotated
from langchain_core.messages import BaseMessage, SystemMessage, AIMessage, HumanMessage
import operator
from .llm import get_llm
from .vector_db import VectorDBManager
from .student_profile import StudentProfileManager
from .prompts import get_tutor_greeting_prompt, get_teach_concept_prompt, get_evaluate_module_prompt, get_grade_student_prompt, get_insight_prompt

# Global cache to prevent the RAM Killer (reloading the HuggingFace model every message)
_db_cache = {}

def get_cached_db(topic: str) -> VectorDBManager:
    if topic not in _db_cache:
        _db_cache[topic] = VectorDBManager(topic_name=topic)
    return _db_cache[topic]

class TutorState(TypedDict):
    """
    Represents the complete state of the tutoring session at any given moment.
    LangGraph nodes read and update this dictionary to decide what to do next.
    """
    curriculum: Dict[str, Any]
    current_module_index: int
    current_concept_index: int
    
    # NEW: We need a place to store the text retrieved from ChromaDB 
    # so the next node (Teach or Quiz) can read it!
    current_context: str
    
    messages: Annotated[List[BaseMessage], operator.add]
    is_testing_mode: bool
    latest_score: int  
    failed_attempts: int 
    course_complete: bool

# ==========================================
# Phase 3: LangGraph Nodes
# ==========================================

def retrieve_knowledge_node(state: TutorState) -> Dict[str, Any]:
    """
    Node 1: The Researcher
    Looks at exactly where the student is in the syllabus and pulls the relevant facts 
    from the ChromaDB Vector Store.
    """
    curriculum = state.get("curriculum", {})
    mod_idx = state.get("current_module_index", 0)
    con_idx = state.get("current_concept_index", 0)
    is_testing = state.get("is_testing_mode", False)
    
    # Safety Check: If course is complete, do nothing
    if state.get("course_complete", False):
        return {"current_context": ""}
        
    current_module = curriculum.get("modules", [])[mod_idx]
    
    # 1. Determine what we are searching for
    if is_testing:
        # If they finished a module, we are quizzing them on the WHOLE module.
        # So we search ChromaDB for the broad module title.
        query = current_module.get("title", "")
        print(f"\n[Node: Retrieve] Preparing to test Module: '{query}'")
    else:
        # If we are just teaching, we search for the specific single concept.
        concepts = current_module.get("concepts", [])
        query = concepts[con_idx] if con_idx < len(concepts) else current_module.get("title", "")
        print(f"\n[Node: Retrieve] Preparing to teach Concept: '{query}'")

    # 2. Query the Vector Database using the cached Singleton
    topic = curriculum.get("topic", "default_topic")
    db = get_cached_db(topic)
    
    # We pull more chunks for a module test (7), fewer for a single concept (4)
    k_chunks = 7 if is_testing else 4
    docs = db.retrieve_relevant_knowledge(query, top_k=k_chunks)
    
    # 3. Format the text for the LLM
    if not docs:
        context_str = "No source context available in the database for this query."
    else:
        # We combine the retrieved text into one giant string
        context_str = "\n\n---\n\n".join([d.page_content for d in docs])
        
    print(f"-> Successfully retrieved {len(docs)} knowledge chunks from memory.")
    
    # 4. Update the State
    # LangGraph automatically merges this dictionary back into the main TutorState
    return {"current_context": context_str}

def teach_concept_node(state: TutorState) -> Dict[str, Any]:
    """
    Node 2: The Lecturer
    Takes the retrieved context and translates it into a friendly, pedagogical 
    lesson for the student. Adapts difficulty based on failed_attempts.
    """
    llm = get_llm()
    
    curriculum = state.get("curriculum", {})
    level = curriculum.get("level", "Beginner")
    mod_idx = state.get("current_module_index", 0)
    con_idx = state.get("current_concept_index", 0)
    context = state.get("current_context", "")
    failed_attempts = state.get("failed_attempts", 0)
    
    current_module = curriculum.get("modules", [])[mod_idx]
    concepts = current_module.get("concepts", [])
    
    if con_idx >= len(concepts):
        # Should not happen because of Graph Edges, but safe fallback
        return {}
        
    current_concept = concepts[con_idx]
    print(f"\n[Node: Teach] Generating lesson for: '{current_concept}'...")
    
    # Load the full student profile — pass it whole to the prompt
    db = StudentProfileManager()
    profile = db.load_profile()

    # Single adaptive persona — the prompt matrix handles all fine-tuned adjustments
    persona = "highly adaptive, human-like AI mentor"

    # --- CONTEXT SAFETY FILTER ---
    # We iterate backwards through the chat history and only keep whole messages until we hit a 4000-character safety limit.
    # This guarantees we never blow up the LLM token limit, while perfectly preserving conversational flow.
    raw_messages = state.get("messages", [])
    
    # Check if this is the first message (greeting / onboarding intro)
    is_greeting = False
    if len(raw_messages) == 1 and getattr(raw_messages[0], "name", "") == "system_init":
        is_greeting = True

    if is_greeting:
        system_prompt = get_tutor_greeting_prompt(persona, level, current_concept, curriculum)
    else:
        system_prompt = get_teach_concept_prompt(persona, level, current_concept, context, profile, failed_attempts)

    safe_history = []
    char_count = 0
    
    for msg in reversed(raw_messages):
        msg_len = len(str(msg.content))
        if char_count + msg_len > 4000:
            break
        safe_history.insert(0, msg) # Insert at start to maintain chronological order
        char_count += msg_len
        
    messages_to_pass = [SystemMessage(content=system_prompt)] + safe_history
    
    try:
        response = llm.invoke(messages_to_pass)
        # Because we use 'operator.add' in the State, returning a list appends it to history
        return {"messages": [response]}
        
    except Exception as e:
        print(f"❌ Error in Teach Node: {e}")
        fallback = AIMessage(content=f"Oops, I had a momentary lapse in memory while trying to teach *{current_concept}*. Let's try that again. Does the general idea of it make sense so far?")
        return {"messages": [fallback]}

def evaluate_module_node(state: TutorState) -> Dict[str, Any]:
    """
    Node 3: The Examiner
    When a module is finished (is_testing_mode=True), this generates a single, rigorous 
    short-answer question to verify the student actually understood the material.
    """
    llm = get_llm()
    
    curriculum = state.get("curriculum", {})
    level = curriculum.get("level", "Beginner")
    mod_idx = state.get("current_module_index", 0)
    context = state.get("current_context", "")
    failed_attempts = state.get("failed_attempts", 0)
    
    current_module = curriculum.get("modules", [])[mod_idx]
    module_title = current_module.get("title", "")
    
    print(f"\n[Node: Quiz] Generating assessment for Module: '{module_title}'...")
    
    # Adaptive Testing Logic
    adaptation_prompt = ""
    if failed_attempts > 0:
        adaptation_prompt = f"\nCRITICAL INSTRUCTION: The student just FAILED the previous test for this module. You MUST generate a completely NEW and DIFFERENT question. Do not repeat the same question. Consider asking it in a simpler, more applied way."

    system_prompt = get_evaluate_module_prompt(level, module_title, context, adaptation_prompt)

    # --- CONTEXT SAFETY FILTER ---
    raw_messages = state.get("messages", [])
    safe_history = []
    char_count = 0
    for msg in reversed(raw_messages):
        msg_len = len(str(msg.content))
        if char_count + msg_len > 4000:
            break
        safe_history.insert(0, msg)
        char_count += msg_len
        
    messages_to_pass = [SystemMessage(content=system_prompt)] + safe_history
    
    try:
        response = llm.invoke(messages_to_pass)
        return {"messages": [response]}
        
    except Exception as e:
        print(f"❌ Error in Quiz Node: {e}")
        fallback = AIMessage(content=f"Let's see if you understood {module_title}. Can you summarize the main takeaway in your own words?")
        return {"messages": [fallback]}

def grade_student_node(state: TutorState) -> Dict[str, Any]:
    """
    Node 4: The Grader
    Takes the student's answer to the Quiz, compares it to the Vector DB truth,
    and assigns a strict 0-100 score along with feedback.
    """
    llm = get_llm()
    
    messages = state.get("messages", [])
    context = state.get("current_context", "")
    
    # Safety Check: Ensure there is actually a question and an answer
    if len(messages) < 2:
        return {"latest_score": 0, "messages": [AIMessage(content="Error: Could not find your answer to grade.")]}
        
    # The second-to-last message is the AI's question, the last is the User's reply
    ai_question = messages[-2].content
    student_answer = messages[-1].content
    
    print("\n[Node: Grade] Evaluating the student's answer...")
    
    import re
    import json
    
    system_prompt = get_grade_student_prompt(ai_question, student_answer, context)

    try:
        response = llm.invoke([
            SystemMessage(content="You output ONLY valid JSON without markdown formatting."), 
            HumanMessage(content=system_prompt)
        ])
        
        content_str = response.content
        if isinstance(content_str, list):
            content_str = "".join([block.get("text", "") for block in content_str if isinstance(block, dict)])
            
        # Aggressively strip markdown to prevent the JSON Regex Crash
        clean_str = str(content_str).replace("```json", "").replace("```", "").strip()
        match = re.search(r'\{.*\}', clean_str, re.DOTALL)
        if match:
            raw_json = match.group(0)
            evaluation = json.loads(raw_json)
            
            score = int(evaluation.get("score", 0))
            feedback = evaluation.get("feedback", "No feedback provided.")
            
            print(f"-> Student Scored: {score}/100")
            
            return {
                "latest_score": score,
                "messages": [AIMessage(content=feedback)]
            }
        else:
            raise ValueError("LLM response did not contain JSON.")

    except Exception as e:
        print(f"❌ Error in Grade Node: {e}")
        return {
            "latest_score": 0, 
            "messages": [AIMessage(content="I had trouble grading that. Let's be safe and say you need to review the material a bit more.")]
        }

def insight_node(state: TutorState) -> Dict[str, Any]:
    """
    Node 6: The Psychologist (Background Observer)
    Silently analyzes the last student message for emotion, boredom, and confusion.
    Updates the long-term Student Profile on disk. Returns nothing to the state layout.
    """
    messages = state.get("messages", [])
    if not messages or not isinstance(messages[-1], HumanMessage) or getattr(messages[-1], "name", "") == "system_init":
        return {}
        
    student_msg = messages[-1].content
    ai_context = messages[-2].content if len(messages) >= 2 else ""
    
    # We run this quickly. We only care about tracking these metrics over time.
    llm = get_llm()
    import re, json
    
    prompt = get_insight_prompt(ai_context, student_msg)
    try:
        response = llm.invoke([
            SystemMessage(content="You are a silent psychological observer. Output ONLY valid JSON."),
            HumanMessage(content=prompt)
        ])
        
        # Aggressively strip markdown to prevent the silent JSON crash
        content_str = str(response.content).replace("```json", "").replace("```", "").strip()
        match = re.search(r'\{.*\}', content_str, re.DOTALL)
        if match:
            metrics = json.loads(match.group(0))
            
            # Save to the local database
            db = StudentProfileManager()
            db.update_metrics(metrics)
            
            print(f"👁️‍🗨️ [Insight] Emotion: {metrics.get('emotional_state')} | Boredom: {metrics.get('boredom_score')}/10 | Confusion: {metrics.get('confusion_score')}/10 | Velocity: {metrics.get('learning_velocity')} | Pref: {metrics.get('explanation_preference')} | Depth: {metrics.get('question_depth_trend')} | Pretend: {metrics.get('pretend_understanding_flags')}")
    except Exception as e:
        # We no longer fail silently! If the Psychologist crashes, we log it so we can fix it.
        print(f"⚠️ [Insight Tracker Error]: Failed to analyze psychology. Error: {e}")
        
    return {}

if __name__ == "__main__":
    # A standalone mock test to verify our Nodes work perfectly before routing them with LangGraph
    print("--- Testing Tutor Nodes Independently ---")
    
    # 1. Mock Curriculum
    mock_curriculum = {
        "topic": "Reinforcement Learning",
        "level": "Beginner",
        "modules": [
            {
                "module_id": "m1",
                "title": "Introduction to Reinforcement Learning",
                "description": "Basic concepts of agents acting in environments",
                "concepts": ["What is an Agent?", "Rewards and Environments"]
            }
        ]
    }
    
    # 2. Mock State
    test_state: TutorState = {
        "curriculum": mock_curriculum,
        "current_module_index": 0,
        "current_concept_index": 0,
        "current_context": "",
        "messages": [],
        "is_testing_mode": False,  
        "latest_score": 0,
        "failed_attempts": 0,
        "course_complete": False
    }
    
    # 3. Simulate Node 1: Retrieval
    print("\n--- Executing Node 1: Retrieval ---")
    retrieval_update = retrieve_knowledge_node(test_state)
    test_state["current_context"] = retrieval_update["current_context"]
    print(f"Retrieved {len(test_state['current_context'])} characters of context from Vector DB.")
    
    # 4. Simulate Node 2: Teach (When is_testing_mode = False)
    print("\n--- Executing Node 2: Teaching ---")
    teach_update = teach_concept_node(test_state)
    print(f"\nAI Teacher Output:\n{teach_update['messages'][0].content}")
    test_state["messages"].extend(teach_update["messages"])
    
    # 5. Simulate transition to Module End (Quiz)
    print("\n--- Switching State to is_testing_mode = True ---")
    test_state["is_testing_mode"] = True
    
    # Note: In the real graph, we would run Retrieve again here to get broad module context 
    # instead of single concept context, but we will just pass the existing state for expediency in this test.
    retrieval_test_update = retrieve_knowledge_node(test_state)
    test_state["current_context"] = retrieval_test_update["current_context"]
    
    print("\n--- Executing Node 3: Quiz ---")
    quiz_update = evaluate_module_node(test_state)
    print(f"\nAI Examiner Output:\n{quiz_update['messages'][0].content}")
    test_state["messages"].extend(quiz_update["messages"])
    
    print("\n--- Simulating Student Answer ---")
    print("User: 'An agent is an entity that takes actions in an environment to maximize its cumulative reward.'")
    student_answer = HumanMessage(content="An agent is an entity that takes actions in an environment to maximize its cumulative reward.")
    test_state["messages"].append(student_answer)
    
    print("\n--- Executing Node 4: Grade ---")
    grade_update = grade_student_node(test_state)
    print(f"\nAI Grader Output:\nScore: {grade_update['latest_score']}\nFeedback: {grade_update['messages'][0].content}")
