import os
import httpx
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"

payload = {
    "contents": [{"parts": [{"text": "Hello, are you online?"}]}]
}

print("Sending raw POST request to Gemini API...")
try:
    response = httpx.post(url, json=payload, timeout=5.0)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
