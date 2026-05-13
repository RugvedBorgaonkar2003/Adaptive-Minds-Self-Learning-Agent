from src.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

llm = get_llm()

print("Testing single string...")
response = llm.invoke("Hello!")
print("String response:", response.content)

print("\nTesting HumanMessage only...")
response = llm.invoke([HumanMessage(content="Hello!")])
print("HumanMessage response:", response.content)

print("\nTesting SystemMessage + HumanMessage...")
try:
    response = llm.invoke([SystemMessage(content="You are a helpful assistant."), HumanMessage(content="Hello!")])
    print("System+Human response:", response.content)
except Exception as e:
    print(f"Error: {e}")
