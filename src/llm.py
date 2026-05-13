import os
from dotenv import load_dotenv

# CRITICAL: load_dotenv must be called before ANY LangChain imports
# so that LangSmith tracing environment variables are present at init time.
load_dotenv()

from langchain_groq import ChatGroq

# ── LangSmith Tracing Confirmation ──────────────────────────────────────────
_tracing = os.getenv("LANGCHAIN_TRACING_V2", "false").lower()
_ls_key  = os.getenv("LANGCHAIN_API_KEY", "")
_project = os.getenv("LANGCHAIN_PROJECT", "default")

if _tracing == "true" and _ls_key:
    print(f"[LangSmith] Tracing ENABLED -> Project: '{_project}'")
else:
    print("[WARN] LangSmith tracing is OFF. Set LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY in .env to enable.")
# ────────────────────────────────────────────────────────────────────────────

def get_llm():
    """
    Returns an instance of the Groq LLM (Llama 3.1 8B).
    Provides instant generation speeds with generous free-tier rate limits.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Warning: GROQ_API_KEY is not set in the environment variables!")

    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=api_key,
        temperature=0.0,
        max_retries=3
    )

    return llm

if __name__ == "__main__":
    # Test connection
    llm = get_llm()
    print(f"Testing LLM connection to {llm.model_name}...")
    try:
        response = llm.invoke("Hello, are you online?")
        print(f"Response: {response.content}")
    except Exception as e:
        print(f"Error connecting to Groq: {e}")
