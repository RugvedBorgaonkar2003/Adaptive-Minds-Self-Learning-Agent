import os
from dotenv import load_dotenv

# Note: You may need to run `pip install langchain-google-genai` if not already installed.
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

def get_llm():
    """
    Returns an instance of the Gemini LLM configured with gemini-3-flash-preview model.
    """
    # Accessing the specific API key variable as requested
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY is not set in the environment variables!")
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        api_key=api_key,
        temperature=0.0, # zero temperature for deterministic planning/extraction
        max_retries=0,   # Set retries to 0 so it fails fast instead of hanging on errors
    )
    return llm

if __name__ == "__main__":
    # Test connection
    llm = get_llm()
    print(f"Testing LLM connection to {llm.model}...")
    try:
        response = llm.invoke("Hello, are you online?")
        print(f"Response: {response.content}")
    except Exception as e:
        print(f"Error connecting to Gemini: {e}")
