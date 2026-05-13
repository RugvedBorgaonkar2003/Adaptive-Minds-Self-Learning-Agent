from typing import TypedDict, List, Dict, Any, Annotated
from langchain_core.messages import BaseMessage, SystemMessage, AIMessage, HumanMessage
import operator
from src.llm import get_llm
from src.vector_db import VectorDBManager
from src.student_profile import StudentProfileManager

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

    # 2. Query the Vector Database
    db = VectorDBManager()
    
    # We pull more chunks for a module test (7), fewer for a single concept (4)
    k_chunks = 7 if is_testing else 4
    docs = db.retrieve_relevant_knowledge(query, top_k=k_chunks)
    
    # 3. Format the text for the LLM
    if not docs:
        context_str = "No specific context found. Rely on general AI programming knowledge."
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
    
    # Adaptive teaching logic
    db = StudentProfileManager()
    profile = db.load_profile()
    
    emotion = profile.get("emotional_state", "neutral")
    pref = profile.get("explanation_preference", "balance")
    boredom = int(profile.get("boredom_score", 0))
    confusion = int(profile.get("confusion_score", 0))
    velocity = profile.get("learning_velocity", "medium")
    
    adaptation_prompt = f"\n-- PSYCHOLOGICAL METRICS & PACING OVERRIDE --"
    adaptation_prompt += f"\nThe student's current emotional state is: {emotion.upper()}."
    adaptation_prompt += f"\nTheir explanation preference is: {pref.upper()}."
    
    if confusion >= 6:
        adaptation_prompt += "\nCRITICAL: The student is highly CONFUSED. You MUST slow down. Use an extremely simple, relatable analogy. Avoid jargon."
    elif boredom >= 6 and emotion != "frustrated":
        adaptation_prompt += "\nCRITICAL: The student is BORED. Their learning velocity allows you to speed up. Skip the basics and jump straight to the most advanced, thought-provoking application of this concept."
        
    if failed_attempts > 0:
        adaptation_prompt += f"\nCRITICAL INSTRUCTION: The student just failed the end-of-module test. They are struggling. You MUST teach this using NEW, simpler analogies. Break it down much further than your standard explanation."

    system_prompt = f"""You are a world-class AI Tutor teaching a '{level}' student. 
Your current goal is to teach the concept: "{current_concept}".

Base your lesson on this ground-truth knowledge from the curriculum:
<context>
{context}
</context>
{adaptation_prompt}

Instructions:
1. Explain the concept clearly, speaking directly to the student.
2. ADAPT YOUR TONE AND EXPLANATION STYLE to perfectly match the Psychological Metrics provided above. 
3. If their preference is "analogy", rely heavily on real-world examples. If "code", give a tiny pseudo-code snippet. 
4. Keep the lesson concise (2-3 short, readable paragraphs). Do not overwhelm them with a wall of text.
5. End your message by asking an engaging verification question like: "Does this make sense?" or "Can you see how this applies to X?". DO NOT give them a formal quiz test yet.
"""

    # We feed the LLM the system instructions PLUS the entire chat history so it remembers the conversation
    messages_to_pass = [SystemMessage(content=system_prompt)] + state.get("messages", [])
    
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

    system_prompt = f"""You are a world-class AI Tutor assessing a '{level}' student. 
The student has just finished learning the module: "{module_title}".

Your goal is to verify they actually understood the material. 
Base your question ONLY on this ground-truth knowledge from the curriculum:
<context>
{context}
</context>
{adaptation_prompt}

Instructions:
1. Generate EXACTLY ONE clear, targeted question that tests their comprehension of the core concepts in this module.
2. DO NOT ask multiple choice questions. Ask a short-answer question that requires them to explain or apply the concept in their own words.
3. Keep the tone encouraging but academically rigorous. e.g., "Alright, we've finished this chapter! Before we move on, let's do a quick knowledge check: [Question]"
4. DO NOT provide the answer in your response.
"""

    messages_to_pass = [SystemMessage(content=system_prompt)] + state.get("messages", [])
    
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
    
    system_prompt = f"""You are a strict but encouraging AI Teacher grading a student's end-of-module test.
You must evaluate their answer against the Ground Truth Facts.

Question Asked: "{ai_question}"
Student's Answer: "{student_answer}"

Ground Truth Facts:
<context>
{context}
</context>

Instructions:
1. Compare the student's answer to the ground truth facts.
2. Assign an integer score from 0 to 100. (70 or higher is passing).
3. Write 2-3 short sentences of encouraging feedback. 
4. CRITICAL: If they scored under 70, DO NOT give them the direct answer. Just give a hint about what they missed so they can try again.

You MUST return ONLY a valid JSON object matching this exact schema:
{{
    "score": 85,
    "feedback": "Excellent job! You correctly identified that..."
}}
"""

    try:
        response = llm.invoke([
            SystemMessage(content="You output ONLY valid JSON without markdown formatting."), 
            HumanMessage(content=system_prompt)
        ])
        
        content_str = response.content
        if isinstance(content_str, list):
            content_str = "".join([block.get("text", "") for block in content_str if isinstance(block, dict)])
            
        match = re.search(r'\{.*\}', str(content_str), re.DOTALL)
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
    
    prompt = f"""Analyze the student's latest message for psychological and cognitive indicators.

AI Tutor recently said: "{ai_context}"
Student replied: "{student_msg}"

Determine the following metrics:
1. boredom_score (0-10): How bored or disengaged do they sound? (e.g., short, dismissive answers)
2. confusion_score (0-10): How confused are they?
3. emotional_state: Output exactly one of: "frustrated", "confident", "anxious", "flow", "neutral"
4. question_depth_trend: Output exactly one of: "shallow", "medium", "deep". (If they just answered a question and didn't ask one, rate the depth of their thought).

Return ONLY valid JSON matching this schema exactly:
{{
    "boredom_score": 0,
    "confusion_score": 0,
    "emotional_state": "neutral",
    "question_depth_trend": "shallow"
}}
"""
    try:
        response = llm.invoke([
            SystemMessage(content="You are a silent psychological observer. Output ONLY valid JSON."),
            HumanMessage(content=prompt)
        ])
        
        content_str = str(response.content)
        match = re.search(r'\{.*\}', content_str, re.DOTALL)
        if match:
            metrics = json.loads(match.group(0))
            
            # Save to the local database
            db = StudentProfileManager()
            db.update_metrics(metrics)
            
            print(f"👁️‍🗨️ [Insight Tracker]: Emotion: {metrics.get('emotional_state')} | Boredom: {metrics.get('boredom_score')}/10 | Confusion: {metrics.get('confusion_score')}/10")
    except Exception as e:
        # We silently swallow errors here to not interrupt the teaching flow
        pass
        
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
