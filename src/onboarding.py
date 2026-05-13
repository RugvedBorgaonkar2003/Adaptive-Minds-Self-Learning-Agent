import json
from typing import Annotated, TypedDict, List
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from src.llm import get_llm

# Define the State for the Onboarding Graph
class OnboardingState(TypedDict):
    messages: Annotated[list, add_messages]  #add_messages is reducer function here
    topic: str
    level: str
    goal_type: str
    sources_uploaded: bool
    sources_list: List[str]
    is_complete: bool

def interview_node(state: OnboardingState):
    """
    This node handles the conversation. It looks at what is missing
    and asks the user for the information in a conversational way.
    """
    llm = get_llm()

    # Check what's missing
    missing_info = []

    if not state.get("topic"):
        missing_info.append("topic to learn")

    if not state.get("level"):
        missing_info.append("desired depth/level of learning (e.g. beginner to advanced)")
        
    if not state.get("goal_type"):
        missing_info.append("primary learning goal (e.g., Exam Prep, Project Building, Deep Conceptual Understanding)")

    # Sources are optional, but we must ask about them at least once
    has_asked_sources = any(
        # Handle cases where msg.content might be a list (e.g., list of content blocks)
        "source" in str(msg.content).lower() 
        for msg in state.get("messages", []) 
        if isinstance(msg, AIMessage)
    )

    if not state.get("sources_uploaded") and not has_asked_sources:
        missing_info.append("any sources they want to upload (links, pdfs) or if the agent should research on its own")

    system_prompt = f"""You are the Onboarding Agent for an Advanced AI Tutor.
    Your goal is to politely and concisely gather the following information from the student:
    Missing info: {', '.join(missing_info)}

    Ask one clear question at a time. Be encouraging. 
    If the student provides the information, acknowledge it and ask the next missing piece.Ask one by one.
    Do not generate a curriculum yet. Only gather information.
    """

    messages_to_pass = [SystemMessage(content=system_prompt)] + state["messages"]

    response = llm.invoke(messages_to_pass)

        
    return {"messages": [response]}


def extraction_node(state: OnboardingState):
    """
    A behind-the-scenes node that uses the LLM to process the chat history
    and strictly extract the variables into JSON format to update the state.
    """
    llm = get_llm()
    
    # We use a JSON-structured prompt to force the local LLM to output valid JSON
    extraction_prompt = """Review the conversation history between the user and the AI.
Extract the following exact details if they have been provided.
Return ONLY a valid JSON object with the following keys:
- "topic": string (the subject to learn, or "no topic provided" if not yet provided)
- "level": string (the depth, e.g. "basic to advanced", or "" if not yet provided)
- "goal_type": string (the primary reason they are learning, e.g. "Exam Prep", "Project", "Deep Review", or "" if not yet provided)
- "has_sources": boolean (true if user provided links/files, false if they explicitly said no, or null if unknown)
- "sources": list of strings (the actual links/names provided, or "NO SOURCES PROVIDED" if none)
- "is_complete": boolean (true ONLY if topic, level, goal_type, and the sources question have been definitively answered)

Conversation:
"""
    for msg in state["messages"]:
        prefix = "User" if isinstance(msg, HumanMessage) else "AI"
        extraction_prompt += f"{prefix}: {msg.content}\n"

    try:
        # Adding a specific instruction for Gemini model to behave
        response = llm.invoke([SystemMessage(content="You are a strict JSON extractor. Output ONLY valid JSON."), 
                            HumanMessage(content=extraction_prompt)])
        # When response.content is a list, it usually looks like: [{'text': '{"topic"...}', 'type': 'text'}]
        if isinstance(response.content, list):
            content_str = "".join([block.get("text", "") for block in response.content if isinstance(block, dict)])
        else:
            content_str = str(response.content)
            
        # Clean up the response in case the Gemini LLM added markdown code blocks
        raw_content = content_str.replace("```json", "").replace("```", "").strip()
        extracted_data = json.loads(raw_content)
        
        return {
            "topic": extracted_data.get("topic", state.get("topic", "")),
            "level": extracted_data.get("level", state.get("level", "")),
            "goal_type": extracted_data.get("goal_type", state.get("goal_type", "")),
            "sources_uploaded": extracted_data.get("has_sources", state.get("sources_uploaded", False)),
            "sources_list": extracted_data.get("sources", state.get("sources_list", [])),
            "is_complete": extracted_data.get("is_complete", False)
        }
    except Exception as e:
        print(f"Extraction failed/parsing error: {e}")
        # If extraction fails, we just don't update state and let conversation continue
        return {}


# Build the Graph
builder = StateGraph(OnboardingState)

# Add Nodes
builder.add_node("interview_node", interview_node)
builder.add_node("extraction_node", extraction_node)

# Set up edges
builder.add_edge(START, "interview_node")
builder.add_edge("interview_node", "extraction_node")
builder.add_edge("extraction_node", END)
# Compile
onboarding_graph = builder.compile()


def run_onboarding() -> dict:
    # Test the onboarding flow in terminal
    print("Welcome to Adaptive Minds! (Type 'quit' to exit)")
    state = {
        "messages": [],
        "topic": "",
        "level": "",
        "goal_type": "",
        "sources_uploaded": False,
        "sources_list": [],
        "is_complete": False
    }

    # Wait for the user's initial prompt instead of a hardcoded trigger
    user_input = input("\nYou: ")
    if user_input.lower() == 'quit':
        return None
        
    state["messages"].append(HumanMessage(content=user_input))
    
    while True:
        # Run graph
        result_state = onboarding_graph.invoke(state)
        
        # Print AI's latest message
        latest_ai_message = result_state["messages"][-1].content
        print(f"\nAI: {latest_ai_message}")
        
        # Ensure our state stays updated for the next iteration
        state = result_state
        
        if state.get("is_complete"):
            print("\n--- ONBOARDING COMPLETE ---")
            print(f"Topic: {state['topic']}")
            print(f"Level: {state['level']}")
            print(f"Goal Type: {state['goal_type']}")
            print(f"Sources Uploaded: {state['sources_uploaded']}")
            print(f"Sources List: {state['sources_list']}")
            return state
            
        user_input = input("\nYou: ")
        if user_input.lower() == 'quit':
            return None
            
        state["messages"].append(HumanMessage(content=user_input))

if __name__ == "__main__":
    run_onboarding()

def run_onboarding_api(request) -> dict:
    """
    API-friendly alternative to run_onboarding. Takes the Pydantic OnboardingRequest
    and maps it immediately to the structured dictionary the orchestrator expects,
    bypassing the conversational prompt loop.
    """
    return {
        "topic": request.topic,
        "level": request.level,
        "goal_type": request.goal_type,
        "sources_list": request.sources_list,
        "sources_uploaded": len(request.sources_list) > 0,
        "is_complete": True
    }
