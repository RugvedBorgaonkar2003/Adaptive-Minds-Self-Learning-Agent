import json
import re
from typing import Dict, Any
from .llm import get_llm
from .vector_db import VectorDBManager
from langchain_core.messages import SystemMessage, HumanMessage

class CurriculumGenerator:
    """
    Acts as the Principal/Dean of the AI Tutor.
    Queries the VectorDB for the stored knowledge and uses the LLM to synthesize 
    a highly structured, JSON-based Concept Tree (Syllabus) for the student.
    """
    def __init__(self, db_manager: VectorDBManager):
        self.db_manager = db_manager
        self.llm = get_llm()

    def generate_curriculum(self, topic: str, level: str, goal_type: str = "Deep Conceptual Understanding") -> Dict[str, Any]:
        print(f"\n--- Generating {level.upper()} Curriculum for '{topic}' (Goal: {goal_type}) ---")
        
        # 1. Retrieve broad context from the Vector DB
        # We retrieve a large number of chunks (top 15) to give the LLM a comprehensive
        # overview of the concepts we parsed during the Orchestrator phase.
        retrieved_docs = self.db_manager.retrieve_relevant_knowledge(query=topic, top_k=15)
        
        if not retrieved_docs:
            print("Warning: Vector DB returned no context. Generating blind curriculum.")
            context_text = "No specific context available. Rely on general knowledge."
        else:
            print(f"Retrieved {len(retrieved_docs)} chunks from Vector DB to build context.")
            # Combine chunks iteratively to prevent blindly chopping words or math formulas in half
            context_text = ""
            for doc in retrieved_docs:
                chunk_str = f"[Source: {doc.metadata.get('type', 'unknown')}] {doc.metadata.get('title', '')}: {doc.page_content}\n\n"
                # Stop adding full chunks if we hit the 12000 character safety limit
                if len(context_text) + len(chunk_str) > 12000:
                    break
                context_text += chunk_str

        # 2. Strict JSON Prompt
        prompt = f"""You are an expert Professor designing a curriculum.
Based on the provided Knowledge Context, design a structured Concept Tree (Syllabus) 
to teach a '{level}' student about '{topic}'.

CRITICAL INSTRUCTION: The student's primary learning goal is: "{goal_type}".
- If the goal is "Exam Prep", focus your concepts heavily on core definitions, formulas, and typical test scenarios.
- If the goal is "Project Building", structure your modules practically, focusing on implementation steps to build something tangible.
- If the goal is "Deep Conceptual Understanding", focus heavily on foundational theory, analogies, and first principles.

The Concept Tree MUST break the topic down into logical Modules, and each Module into specific Concepts.

You MUST return ONLY a valid JSON object matching this exact schema perfectly. Do not include markdown formatting or commentary.
{{
    "topic": "{topic}",
    "level": "{level}",
    "goal_type": "{goal_type}",
    "modules": [
        {{
            "module_id": "m1",
            "title": "Module 1 Title",
            "description": "Short description of what the student learns here.",
            "concepts": [
                "Specific Concept 1",
                "Specific Concept 2"
            ]
        }}
    ]
}}

Knowledge Context:
{context_text}
"""
        try:
            # 3. Request LLM Synthesis
            response = self.llm.invoke([
                SystemMessage(content="You output ONLY valid JSON using the exact requested schema. No backticks, no markdown."), 
                HumanMessage(content=prompt)
            ])
            
            # Format handling for different LLM library return types
            content_str = response.content
            if isinstance(content_str, list):
                content_str = "".join([block.get("text", "") for block in content_str if isinstance(block, dict)])
            
            # 4. Strict Regex JSON Extraction (Crash Prevention)
            # Aggressively strip markdown backticks to prevent json.loads from instantly crashing
            clean_str = str(content_str).replace("```json", "").replace("```", "").strip()
            match = re.search(r'\{.*\}', clean_str, re.DOTALL)
            if match:
                raw_json = match.group(0)
                curriculum = json.loads(raw_json)
                print("✅ Curriculum Concept Tree successfully generated and validated!")
                return curriculum
            else:
                raise ValueError("LLM response did not contain a valid JSON object.")
                
        except Exception as e:
            print(f"❌ Error generating curriculum: {e}")
            # Fallback Curriculum to ensure the pipeline never hard-crashes
            print("Deploying Fallback Curriculum...")
            return {
                "topic": topic,
                "level": level,
                "goal_type": goal_type,
                "modules": [
                    {
                        "module_id": "m1",
                        "title": f"Introduction to {topic}",
                        "description": "Emergency Fallback Module",
                        "concepts": ["Basic Overview"]
                    }
                ]
            }

if __name__ == "__main__":
    # Test script
    db = VectorDBManager()
    generator = CurriculumGenerator(db)
    
    test_curriculum = generator.generate_curriculum("Reinforcement Learning", "Advanced", "Project Building")
    
    print("\n--- Final Output ---")
    print(json.dumps(test_curriculum, indent=4))
