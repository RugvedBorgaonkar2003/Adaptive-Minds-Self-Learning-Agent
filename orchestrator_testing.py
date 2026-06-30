import asyncio
from src.orchestrator import KnowledgeOrchestrator

async def run_test():
    orchestrator = KnowledgeOrchestrator()
    
    # Simulate an onboarding state
    topic = "Proximal Policy Optimization"
    level = "advanced"
    user_sources = [
        "https://www.youtube.com/watch?v=5P7I-xPq8u8", # A known PPO explanation video
        # Note: you would add local path to a PDF here if you had one for testing
    ]
    
    results = await orchestrator.run(topic, level, user_sources)
    
    for item in results:
        content = item.get("content", "")
        print(f"\nSource URL: {item['url']} | Status: {item['status']}")
        # Print just the first 300 characters to verify it worked without flooding terminal
        print(f"Extracted Length: {len(content)} characters. Preview: {content[:300]}...\n")

if __name__ == "__main__":
    asyncio.run(run_test())
