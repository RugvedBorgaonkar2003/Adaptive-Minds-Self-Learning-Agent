from langgraph.graph import StateGraph, START, END
from typing import Dict, Any, Literal
from langchain_core.messages import HumanMessage, AIMessage

from src.tutor import (
    TutorState, 
    retrieve_knowledge_node, 
    teach_concept_node, 
    evaluate_module_node, 
    grade_student_node,
    insight_node
)
from src.student_profile import StudentProfileManager
from src.notes_gen import NotesGenerator
from src.report_gen import ReportGenerator

# ==========================================
# Graph Compilation
# ==========================================

builder = StateGraph(TutorState)

def progress_manager_node(state: TutorState) -> Dict[str, Any]:
    """
    Node 5: The Principal (Logic & Routing Tracker)

    IMPORTANT: This node does NOT auto-advance concepts anymore.
    Concept progression is now 100% controlled by the frontend — the user
    must explicitly click "Next Concept" which calls /api/concept/advance.

    This node only handles two special scenarios:
      A) The student just passed the end-of-module test (name="module_passed")
      B) The frontend explicitly advanced the concept (name="concept_advance")

    For all normal chat messages, we stay on the same concept so the agent
    can keep answering the student's questions until they feel ready to move on.
    """
    curriculum = state.get("curriculum", {})
    mod_idx = state.get("current_module_index", 0)
    con_idx = state.get("current_concept_index", 0)
    is_testing = state.get("is_testing_mode", False)
    messages = state.get("messages", [])

    modules = curriculum.get("modules", [])

    last_msg_name = getattr(messages[-1], "name", "") if messages else ""

    # SCENARIO A: The frontend just told us the student passed the module test.
    if last_msg_name == "module_passed":
        print("\n[Principal] Module passed signal received. State already updated by api_server.")
        return {}

    # SCENARIO B: The frontend explicitly advanced to the next concept.
    if last_msg_name == "concept_advance":
        print("\n[Principal] Concept advance signal received.")
        if mod_idx >= len(modules):
            return {"course_complete": True}

        current_module = modules[mod_idx]
        concepts = current_module.get("concepts", [])

        if con_idx + 1 >= len(concepts):
            print("\n[Principal] All concepts done. Switching to testing mode.")
            return {
                "is_testing_mode": True,
                "messages": [AIMessage(content="You've completed all concepts in this module! I am generating your End-of-Module Test now... Good luck!")]
            }
        else:
            print(f"\n[Principal] Advancing concept: {con_idx} → {con_idx + 1}")
            return {"current_concept_index": con_idx + 1}

    # DEFAULT: Normal student chat message.
    # Stay on the SAME concept. Do not advance. Let the Teach node respond.
    print(f"\n[Principal] Normal chat on concept {con_idx}. Staying on current concept.")
    return {}

def route_next_step(state: TutorState) -> str:
    """ Look at state flags to route """
    modules = state.get("curriculum", {}).get("modules", [])
    mod_idx = state.get("current_module_index", 0)
    
    if mod_idx >= len(modules):
        return "course_complete"
        
    if state.get("is_testing_mode"):
        # The web UI handles the test generation, presentation, and grading.
        # We must END the graph here so the API can return is_testing_mode=True to the frontend.
        return "wait_for_ui_test"
    else:
        # If not testing, it's teaching time
        return "retrieve_knowledge"

def route_after_retrieval(state: TutorState) -> str:
    # Since testing is handled by UI, retrieval always leads to teaching.
    return "teach_concept"

# Add Nodes
builder.add_node("progress_manager", progress_manager_node)
builder.add_node("insight_node", insight_node)
builder.add_node("retrieve_knowledge", retrieve_knowledge_node)
builder.add_node("teach_concept", teach_concept_node)
builder.add_node("evaluate_module", evaluate_module_node)

def wrapper_grade_node(state: TutorState):
    # Call original grader
    res = grade_student_node(state)
    # Add a 'name' to the feedback message so the principal knows it was graded
    if "messages" in res and len(res["messages"]) > 0:
        res["messages"][0].name = "grade"
    return res
builder.add_node("grade_student", wrapper_grade_node)

# Add Edges
builder.add_edge(START, "insight_node")
builder.add_edge("insight_node", "progress_manager")

builder.add_conditional_edges(
    "progress_manager",
    route_next_step,
    {
        "course_complete": END,
        "retrieve_knowledge": "retrieve_knowledge",
        "grade_student": "grade_student",
        "wait_for_ui_test": END
    }
)

# After Retrieving, either Teach or Quiz
builder.add_conditional_edges(
    "retrieve_knowledge",
    route_after_retrieval,
    {
        "teach_concept": "teach_concept",
        "evaluate_module": "evaluate_module"
    }
)

# Grading node feeds BACK into progress_manager to decide if it should move on instantly
builder.add_edge("grade_student", "progress_manager")

# The conversational nodes (Teach and Quiz) end the Graph so the human can type their answer!
builder.add_edge("teach_concept", END)
builder.add_edge("evaluate_module", END)

from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()
tutor_graph = builder.compile(checkpointer=memory)

# ==========================================
# Terminal Execution Loop
# ==========================================
def run_tutor_session(curriculum: Dict[str, Any]):
    print("\n=========================================")
    print(f"      🎓 Tutor Session Started      ")
    print(f" Topic: {curriculum.get('topic', 'Unknown')} [{curriculum.get('level', 'Unknown')}] ")
    print("=========================================\n")
    
    state = {
        "curriculum": curriculum,
        "current_module_index": 0,
        "current_concept_index": 0, # Start at 0, no progression on first run
        "current_context": "",
        "messages": [HumanMessage(content="Hello, I am ready to begin my lessons.", name="system_init")],
        "is_testing_mode": False,  
        "latest_score": 0,
        "failed_attempts": 0,
        "course_complete": False
    }

    while True:
        # Run graph
        config = {"configurable": {"thread_id": "terminal_session_1"}}
        state = tutor_graph.invoke(state)
        
        # Check completion
        if state.get("current_module_index", 0) >= len(curriculum.get("modules", [])):
             print("\n=========================================")
             print("🎉 CONGRATULATIONS! COURSE COMPLETE 🎉")
             print("=========================================")
             print(f"You have fully mastered all modules in: {curriculum.get('topic', 'the curriculum')}.")
             print("All of your PDF reports and Markdown notes have been beautifully saved in the ./data folder.")
             print("Great job, student! Terminating session.")
             break
             
        # Extract the last AI message
        ai_message = state["messages"][-1].content
        
        # Print AI Message
        print(f"\nTutor:\n{ai_message}\n")
        
        # Get Human Input
        try:
            user_input = input("You: ")
            
            # Interactive Terminal Commands
            if user_input.lower() in ['quit', 'exit', 'stop']:
                print("\nEnding session. Goodbye!")
                break
                
            if user_input.lower() in ("/flashcards"):
                concept = user_input[len("/flashcards")].strip()
                if not concept:
                    print("\n[System] Please provide a concept. Usage: /flashcards <concept>")
                    continue
                
                from src.flashcard_gen import FlashcardGenerator
                flash_gen = FlashcardGenerator()
                cards = flash_gen.generate(concept=concept, num_cards=5)
                flash_gen.display(cards)
                continue  # Skip appending this command to chat history and asking LLM
                
        except EOFError:
            break
            
        # Append Human Input
        state["messages"].append(HumanMessage(content=user_input))

if __name__ == "__main__":
    # Test the standalone terminal execution!
    test_curriculum = {
        "topic": "Reinforcement Learning",
        "level": "Beginner",
        "modules": [
            {
                "module_id": "m1",
                "title": "Introduction to Reinforcement Learning",
                "description": "Basic concepts of agents acting in environments",
                "concepts": ["Basic Overview"]
            }
        ]
    }
    run_tutor_session(test_curriculum)
