import json
import re
import os
import threading
from typing import List, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage

from .llm import get_llm
from .vector_db import VectorDBManager

# 1. Thread Lock for Database Safety
_flashcard_lock = threading.Lock()

# 2. Global Cache to prevent RAM Killer
_db_cache = {}

def get_cached_db(topic: str) -> VectorDBManager:
    if topic not in _db_cache:
        _db_cache[topic] = VectorDBManager(topic_name=topic)
    return _db_cache[topic]

class FlashcardGenerator:
    """
    On-demand flashcard generator.
    The student decides which concept they want flashcards for.
    Queries ChromaDB for ground-truth context, then uses the LLM to
    synthesize a structured deck of Q&A flashcard pairs.
    """

    def __init__(self):
        self.llm = get_llm()
        # VectorDB dynamically fetched via get_cached_db() to prevent RAM leaks
        self.save_dir = "./data/flashcards"
        os.makedirs(self.save_dir, exist_ok=True)

    def generate(self, concept: str, num_cards: int = 5) -> List[Dict[str, Any]]:
        """
        Generate flashcards for a given concept.

        Args:
            concept: The specific concept the student wants flashcards for.
            num_cards: How many flashcard pairs to generate (default 5).

        Returns:
            A list of flashcard dicts with 'front', 'back', 'concept', and 'difficulty'.
        """
        print(f"\n🃏 [Flashcard Generator] Generating {num_cards} cards for: '{concept}'...")

        # 1. Pull relevant context from ChromaDB using cached Singleton
        # In a real pipeline, the active topic is passed. Here we default to general.
        db = get_cached_db("general")
        docs = db.retrieve_relevant_knowledge(query=concept, top_k=5)
        
        if not docs:
            context = f"No specific context found. Generate flashcards based on general knowledge of '{concept}'."
        else:
            # Iterative Context Packing to prevent Blind Truncation (Chain-sawing)
            context = ""
            for doc in docs:
                chunk_str = f"{doc.page_content}\n\n---\n\n"
                if len(context) + len(chunk_str) > 8000:
                    break
                context += chunk_str

        # 2. Build the prompt
        prompt = f"""You are an expert educator creating flashcards for a student.
The student has requested flashcards specifically about: "{concept}"

Use the following knowledge context as your primary source of truth:
<context>
{context}
</context>

Generate exactly {num_cards} flashcard pairs for this concept.

Rules:
1. Each "front" must be a clear, concise question or prompt (not a statement).
2. Each "back" must be the direct, accurate answer — no padding or filler.
3. Vary the difficulty: include some easy recall cards and some harder application cards.
4. Set "difficulty" to exactly one of: "easy", "medium", "hard".
5. Set "concept" to the exact concept name: "{concept}".

You MUST return ONLY a valid JSON array matching this exact schema:
[
    {{
        "front": "What is ...?",
        "back": "It is ...",
        "concept": "{concept}",
        "difficulty": "easy"
    }}
]
"""

        # 3. Call LLM
        try:
            response = self.llm.invoke([
                SystemMessage(content="You are a flashcard creator. Output ONLY a valid JSON array. No markdown, no backticks."),
                HumanMessage(content=prompt)
            ])

            content_str = response.content
            if isinstance(content_str, list):
                content_str = "".join([b.get("text", "") for b in content_str if isinstance(b, dict)])

            # Extract JSON array from response (Aggressively strip markdown to prevent crashes)
            clean_str = str(content_str).replace("```json", "").replace("```", "").strip()
            match = re.search(r'\[.*\]', clean_str, re.DOTALL)
            if not match:
                raise ValueError("LLM response did not contain a valid JSON array.")

            cards = json.loads(match.group(0))
            print(f"✅ Successfully generated {len(cards)} flashcards for '{concept}'.")

            # 4. Save to local file
            self._save(concept, cards)
            return cards

        except Exception as e:
            print(f"❌ Flashcard generation failed: {e}")
            # Return a safe fallback card so the pipeline never crashes
            return [{
                "front": f"What is the core idea behind '{concept}'?",
                "back": "Could not retrieve context. Please try again.",
                "concept": concept,
                "difficulty": "easy"
            }]

    def _save(self, concept: str, cards: List[Dict[str, Any]]):
        """Saves the generated flashcard deck as a JSON file locally."""
        # Sanitize concept name for use as a filename
        safe_name = concept.lower().replace(" ", "_").replace("/", "-")[:60]
        filepath = os.path.join(self.save_dir, f"{safe_name}.json")

        with _flashcard_lock:
            existing = []
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    try:
                        existing = json.load(f)
                    except json.JSONDecodeError:
                        existing = []

            # Merge new cards with existing (avoid duplicates based on 'front')
            existing_fronts = {c["front"] for c in existing}
            new_cards = [c for c in cards if c["front"] not in existing_fronts]
            merged = existing + new_cards

            # Atomic Writes to prevent corrupted files
            temp_path = filepath + ".tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(merged, f, indent=4, ensure_ascii=False)
            os.replace(temp_path, filepath)

        print(f"💾 Flashcards saved to: {filepath}")

    def display(self, cards: List[Dict[str, Any]]):
        """Pretty-prints the flashcards in the terminal."""
        print(f"\n{'='*50}")
        print(f"  🃏 FLASHCARD DECK ({len(cards)} cards)")
        print(f"{'='*50}")
        for i, card in enumerate(cards, 1):
            difficulty_icon = {"easy": "🟢", "medium": "🟡", "hard": "🔴"}.get(card.get("difficulty", "easy"), "⚪")
            print(f"\n[Card {i}] {difficulty_icon} {card.get('difficulty', '').upper()}")
            print(f"  Q: {card.get('front')}")
            print(f"  A: {card.get('back')}")
        print(f"\n{'='*50}")


# ==========================================
# Standalone Test
# ==========================================
if __name__ == "__main__":
    gen = FlashcardGenerator()
    cards = gen.generate(concept="The Bellman Equation", num_cards=5)
    gen.display(cards)
