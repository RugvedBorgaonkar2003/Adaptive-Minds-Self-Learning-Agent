from typing import List, Optional, Dict, Any

# Define the State for the Onboarding Schema
class OnboardingState:
    """
    Schema representation for the Onboarding State.
    """
    topic: str
    level: str
    goal_type: str
    sources_uploaded: bool
    sources_list: List[str]
    is_complete: bool

def run_onboarding_api(
    topic: str,
    level: str,
    goal_type: str,
    sources_list: Optional[List[str]] = None
) -> dict:
    """
    Process the onboarding request parameters and return a structured state dictionary.
    Performs deterministic python-based validation:
    - Verifies topic, level, and goal_type are non-empty strings.
    - Gracefully handles a None or empty sources_list, mapping it to an empty list
      and setting sources_uploaded to False, which signals downstream agents to perform self-scraping.
    """
    if not topic or not topic.strip():
        raise ValueError("Topic is a required field and cannot be empty.")
    if not level or not level.strip():
        raise ValueError("Level is a required field and cannot be empty.")
    if not goal_type or not goal_type.strip():
        raise ValueError("Goal type is a required field and cannot be empty.")

    # Fixed Python parsing for sources
    if sources_list is None:
        cleaned_sources = []
    else:
        cleaned_sources = [s for s in sources_list if s and s.strip()]

    sources_uploaded = len(cleaned_sources) > 0

    return {
        "topic": topic.strip(),
        "level": level.strip(),
        "goal_type": goal_type.strip(),
        "sources_list": cleaned_sources,
        "sources_uploaded": sources_uploaded,
        "is_complete": True
    }
