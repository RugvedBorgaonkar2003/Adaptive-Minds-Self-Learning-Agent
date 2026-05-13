import json
import re
from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage
from src.llm import get_llm
from src.vector_db import VectorDBManager

class ModuleTestGenerator:
    """
    Generates a 5-question multiple-choice test for a specific module 
    using the LLM and ground-truth knowledge from ChromaDB.
    """

    def __init__(self):
        self.llm = get_llm()
        self.db = VectorDBManager()

    def generate_test(self, module_title: str, concepts: List[str]) -> Dict[str, Any]:
        """
        Retrieves context from Vector DB and generates 5 MCQs.
        """
        print(f"\n📝 [Test Generator] Building test for module: {module_title}")

        # 1. Retrieve ground truth
        docs = self.db.retrieve_relevant_knowledge(query=module_title, top_k=5)
        context = "\n\n".join([doc.page_content for doc in docs])[:5000]

        # 2. Build prompt
        prompt = f"""You are an expert AI educator creating an end-of-module quiz.
        
Module Title: {module_title}
Concepts Covered: {', '.join(concepts)}

Knowledge Base Context (Ground Truth):
{context}

Task: Generate exactly 5 multiple-choice questions based on the knowledge base context. The questions should test conceptual understanding, not just rote memorization.

Return ONLY a valid JSON object with the following structure:
{{
    "questions": [
        {{
            "question": "The question text...",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer_index": 0,  // Integer 0-3 corresponding to the correct option
            "explanation": "A brief explanation of why this answer is correct."
        }}
    ]
}}
"""

        # 3. Generate
        try:
            response = self.llm.invoke([
                SystemMessage(content="You are a precise quiz generator. Output ONLY valid JSON."),
                HumanMessage(content=prompt)
            ])
            
            content = str(response.content)
            # Extract JSON block
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                quiz_data = json.loads(match.group(0))
                return quiz_data
            else:
                raise ValueError("LLM response did not contain valid JSON.")
        
        except Exception as e:
            print(f"⚠️ [Test Generator] Error: {e}")
            # Fallback mock test
            return {
                "questions": [
                    {
                        "question": f"What is the core concept of {module_title}?",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correct_answer_index": 0,
                        "explanation": "This is a fallback question due to a generation error."
                    }
                ]
            }

if __name__ == "__main__":
    gen = ModuleTestGenerator()
    test = gen.generate_test("Intro to RL", ["States", "Actions"])
    print(json.dumps(test, indent=2))
