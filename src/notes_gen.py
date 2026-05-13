import os
import re
from datetime import datetime
from typing import Dict, Any

from langchain_core.messages import SystemMessage, HumanMessage

from src.llm import get_llm
from src.vector_db import VectorDBManager
from src.student_profile import StudentProfileManager


class NotesGenerator:
    """
    Auto-generates a personalized, dense Chapter Summary Note after a student
    passes a module (score >= 70).

    The note is styled to the student's explanation_preference and level
    from the StudentProfile, so each student gets a genuinely different note
    for the same module.
    """

    def __init__(self):
        self.llm = get_llm()
        self.db = VectorDBManager()
        self.save_dir = "./data/notes"
        os.makedirs(self.save_dir, exist_ok=True)

    def generate(self, module: Dict[str, Any], topic: str, level: str) -> str:
        """
        Generate and save a chapter summary note for a completed module.

        Args:
            module: The module dict from the curriculum (title, description, concepts).
            topic:  The overall course topic (e.g., "Reinforcement Learning").
            level:  The student's mastery level (e.g., "Beginner", "Advanced").

        Returns:
            The full markdown note as a string.
        """
        module_title = module.get("title", "Unknown Module")
        module_desc = module.get("description", "")
        concepts = module.get("concepts", [])

        print(f"\n📝 [Notes Generator] Writing chapter notes for: '{module_title}'...")

        # 1. Load student's psychological profile to personalize the note
        profile_manager = StudentProfileManager()
        profile = profile_manager.load_profile()
        pref = profile.get("explanation_preference", "balance")
        emotion = profile.get("emotional_state", "neutral")

        # 2. Retrieve rich context from ChromaDB for every concept in the module
        all_context_parts = []
        for concept in concepts:
            docs = self.db.retrieve_relevant_knowledge(query=concept, top_k=3)
            for doc in docs:
                all_context_parts.append(doc.page_content)

        # Also query by module title for broader context
        module_docs = self.db.retrieve_relevant_knowledge(query=module_title, top_k=4)
        for doc in module_docs:
            all_context_parts.append(doc.page_content)

        # Deduplicate by converting to set, then rejoin
        seen = set()
        unique_parts = []
        for part in all_context_parts:
            if part not in seen:
                seen.add(part)
                unique_parts.append(part)

        context = "\n\n---\n\n".join(unique_parts)
        if len(context) > 10000:
            context = context[:10000] + "... [TRUNCATED]"

        if not context.strip():
            context = f"No specific context found. Rely on general knowledge of '{module_title}'."

        # 3. Construct the personalization instruction based on student profile
        style_instruction = self._build_style_instruction(pref, level, emotion)

        # 4. Build the LLM prompt
        concepts_list = "\n".join([f"- {c}" for c in concepts])
        prompt = f"""You are an expert tutor writing a Chapter Summary Note for a student.

The student has just PASSED the following module in their course on "{topic}":

Module: {module_title}
Description: {module_desc}
Concepts covered:
{concepts_list}

{style_instruction}

Use the following ground-truth knowledge as your primary source for the notes:
<context>
{context}
</context>

Write the chapter notes in Markdown format using this structure:
1. A top-level heading: # {module_title} — Chapter Notes
2. A short "TL;DR" summary (2-3 sentences max) under a ## TL;DR heading.
3. A ## Key Concepts section with a subsection for EACH concept covered, explaining it clearly.
4. A ## Key Takeaways section: a tight bullet-point list of the most important things to remember.
5. A ## Common Mistakes to Avoid section: 2-3 pitfalls or misconceptions related to this module.

Rules:
- Be dense and informative — this note should be a standalone reference.
- DO NOT pad or repeat yourself. Every sentence must add value.
- Write entirely in Markdown. Use bold, italics, and code blocks where appropriate.
"""

        # 5. Call the LLM
        try:
            response = self.llm.invoke([
                SystemMessage(content="You are an expert educator writing structured Markdown notes. Be dense, accurate, and helpful."),
                HumanMessage(content=prompt)
            ])

            content_str = response.content
            if isinstance(content_str, list):
                content_str = "".join([b.get("text", "") for b in content_str if isinstance(b, dict)])

            notes_md = str(content_str).strip()
            print(f"✅ Chapter notes successfully generated for '{module_title}'.")

            # 6. Save to local markdown file
            self._save(module_title, notes_md)
            return notes_md

        except Exception as e:
            print(f"❌ Notes generation failed: {e}")
            fallback = f"# {module_title} — Chapter Notes\n\nCould not generate notes at this time. Please try again."
            self._save(module_title, fallback)
            return fallback

    def _build_style_instruction(self, pref: str, level: str, emotion: str) -> str:
        """
        Builds a personalization instruction block for the LLM prompt
        based on the student's current profile metrics.
        """
        lines = ["--- PERSONALIZATION INSTRUCTIONS ---"]

        if pref == "analogy":
            lines.append("STYLE: This student learns best through analogies. For every concept, include a real-world analogy to make it click.")
        elif pref == "code":
            lines.append("STYLE: This student is code-oriented. Include short, illustrative code snippets or pseudocode wherever appropriate.")
        elif pref == "math":
            lines.append("STYLE: This student prefers mathematical formalism. Use equations and formal notation where possible.")
        else:
            lines.append("STYLE: Balance explanations between intuition and precise language. Use analogies where concepts are complex.")

        if level.lower() in ["beginner", "basic"]:
            lines.append("LEVEL: Write for a complete beginner. Avoid jargon. Explain every term you use.")
        elif level.lower() in ["advanced", "expert"]:
            lines.append("LEVEL: Write for an advanced student. Be technically precise. Skip basic definitions and focus on nuance.")
        else:
            lines.append("LEVEL: Write for an intermediate student. Balance approachability with technical accuracy.")

        if emotion == "frustrated":
            lines.append("TONE: The student has been struggling. Be extra encouraging. Use a warm, supportive tone throughout.")
        elif emotion == "confident":
            lines.append("TONE: The student is feeling confident. You can be slightly more demanding and intellectually challenging.")

        return "\n".join(lines)

    def _save(self, module_title: str, content: str):
        """Saves the markdown note to a local file."""
        safe_name = re.sub(r'[^\w\s-]', '', module_title).strip().lower().replace(" ", "_")[:60]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        filename = f"{safe_name}_{timestamp}.md"
        filepath = os.path.join(self.save_dir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"💾 Chapter notes saved to: {filepath}")


# ==========================================
# Standalone Test
# ==========================================
if __name__ == "__main__":
    gen = NotesGenerator()

    test_module = {
        "title": "Introduction to Reinforcement Learning",
        "description": "Basic concepts of agents acting in environments to maximize rewards.",
        "concepts": ["What is an Agent?", "Rewards and Environments", "The Bellman Equation"]
    }

    notes = gen.generate(
        module=test_module,
        topic="Reinforcement Learning",
        level="Beginner"
    )

    print("\n--- GENERATED NOTES PREVIEW (first 800 chars) ---")
    print(notes[:800])
