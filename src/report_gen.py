import os
import re
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from src.llm import get_llm
from src.vector_db import VectorDBManager
from src.student_profile import StudentProfileManager

class ReportGenerator:
    """
    JSON report generator for Adaptive Minds.
    Call generate() after a student passes a module to create the JSON data 
    which the frontend will render beautifully.
    """

    def __init__(self):
        self.llm = get_llm()
        self.db  = VectorDBManager()
        self.save_dir = "./data/reports"
        os.makedirs(self.save_dir, exist_ok=True)

    def generate(
        self,
        module: Dict[str, Any],
        module_number: int,
        curriculum: Dict[str, Any],
        score: int,
        failed_attempts: int,
        messages: List[BaseMessage],
    ) -> str:
        """
        Generate the structured JSON report.
        """
        print("\n📄 [Report Generator] Building module report JSON...")

        # ── Load persistent data ──────────────────────────────────────────────
        profile_mgr   = StudentProfileManager()
        profile        = profile_mgr.load_profile()
        prev_score     = profile_mgr.get_last_module_score()
        module_history = profile.get("module_history", [])
        streak         = profile.get("streak", 0)
        avg_mastery    = profile.get("average_mastery", score)
        
        total_modules_done  = len(module_history)
        total_in_course     = len(curriculum.get("modules", []))
        completion_pct      = int((total_modules_done / total_in_course) * 100) if total_in_course else 0
        total_concepts      = sum(r.get("concepts_count", 0) for r in module_history)

        # ── LLM content ──────────────────────────────────────────────────────
        strength, struggled, action = self._generate_honest_three(
            module, score, failed_attempts, messages, curriculum
        )

        p2_content = self._generate_page2_content(
            module, curriculum, score, failed_attempts, messages, profile
        )
        
        # Find next module
        modules = curriculum.get("modules", [])
        next_module = None
        for i, m in enumerate(modules):
            if m.get("module_id") == module.get("module_id") and i + 1 < len(modules):
                next_module = modules[i + 1]
                break

        # ── Construct JSON payload ────────────────────────────────────────────
        report_data = {
            "metadata": {
                "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                "module_title": module.get("title", ""),
                "module_number": module_number,
                "curriculum_topic": curriculum.get("topic", "")
            },
            "performance": {
                "score": score,
                "prev_score": prev_score,
                "failed_attempts": failed_attempts,
                "concepts_count": len(module.get("concepts", []))
            },
            "honest_three": {
                "strength": strength,
                "struggled": struggled,
                "action": action
            },
            "deep_dive": {
                "concept_mastery": p2_content.get("concept_mastery", {c: score for c in module.get("concepts", [])}),
                "learning_style_text": p2_content.get("learning_style_text", ""),
                "learning_style_tags": ["Direct Learner", "Example-Driven"] # Extracted roughly from profile
            },
            "journey": {
                "avg_mastery": avg_mastery,
                "streak": streak,
                "total_modules_done": total_modules_done,
                "total_in_course": total_in_course,
                "completion_pct": completion_pct,
                "total_concepts_mastered": total_concepts,
                "next_module_title": next_module.get("title", "") if next_module else None,
                "next_module_desc": next_module.get("description", "") if next_module else None,
                "prereq_status": p2_content.get("prereq_status", "ready"),
                "prereq_note": p2_content.get("prereq_note", "")
            }
        }

        # ── Save ─────────────────────────────────────────────────────────────
        safe_name = re.sub(r'[^\w\s-]', '', module.get("title", "")).strip().lower().replace(" ", "_")[:60]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        filename  = f"{safe_name}_{timestamp}.json"
        filepath  = os.path.join(self.save_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)
            
        print(f"✅ Report saved → {filepath}")
        return filepath

    def _generate_honest_three(
        self,
        module: Dict,
        score: int,
        failed_attempts: int,
        messages: List[BaseMessage],
        curriculum: Dict,
    ) -> Tuple[str, str, str]:
        module_title = module.get("title", "Unknown Module")
        concepts     = module.get("concepts", [])
        goal_type    = curriculum.get("goal_type", "Deep Conceptual Understanding")

        history_text = ""
        for msg in messages[-12:]:
            role = "Student" if isinstance(msg, HumanMessage) else "Tutor"
            history_text += f"{role}: {str(msg.content)[:300]}\n"

        docs = self.db.retrieve_relevant_knowledge(query=module_title, top_k=4)
        kb_context = "\n\n".join([d.page_content for d in docs])[:4000]

        prompt = f"""You are an honest and caring AI mentor writing a personalised feedback section for a student who has just completed a module.

Module: "{module_title}"
Concepts covered: {', '.join(concepts)}
Test Score: {score} / 100
Failed Attempts before passing: {failed_attempts}
Student's Goal: {goal_type}

Recent conversation snippets:
{history_text}

Knowledge base context (ground truth):
{kb_context}

Write three short, honest, personalised paragraphs. Each should be 2-3 sentences max. Be specific — reference actual concepts from the module, not generic praise.

Return ONLY a valid JSON object with these three keys:
{{
    "strength": "What the student genuinely did well, referencing specific concepts.",
    "struggled": "Where the student clearly lacked understanding. Be honest, not harsh.",
    "action": "One specific, actionable thing they must do before moving on. Reference the next step in their goal ({goal_type})."
}}"""

        try:
            response = self.llm.invoke([
                SystemMessage(content="You are a concise, honest AI mentor. Output ONLY valid JSON, no markdown."),
                HumanMessage(content=prompt)
            ])
            content = str(response.content)
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                return (
                    data.get("strength",  "Good effort on this module."),
                    data.get("struggled", "Review the module concepts once more."),
                    data.get("action",    "Re-read your notes before the next module."),
                )
        except Exception as e:
            print(f"⚠️  Honest Three generation failed: {e}")

        return ("You passed this module.", "Some concepts need work.", "Review your notes.")

    def _generate_page2_content(
        self,
        module: Dict,
        curriculum: Dict,
        score: int,
        failed_attempts: int,
        messages: List[BaseMessage],
        profile: Dict,
    ) -> Dict:
        module_title  = module.get("title", "")
        concepts      = module.get("concepts", [])
        modules       = curriculum.get("modules", [])
        goal_type     = curriculum.get("goal_type", "Deep Conceptual Understanding")

        next_module = None
        for i, m in enumerate(modules):
            if m.get("module_id") == module.get("module_id") and i + 1 < len(modules):
                next_module = modules[i + 1]
                break

        history_text = ""
        for msg in messages[-10:]:
            role = "Student" if isinstance(msg, HumanMessage) else "Tutor"
            history_text += f"{role}: {str(msg.content)[:250]}\n"

        pref    = profile.get("explanation_preference", "balance")
        emotion = profile.get("emotional_state", "neutral")
        depth   = profile.get("question_depth_trend", "shallow")
        boredom = profile.get("boredom_score", 0)
        confusion = profile.get("confusion_score", 0)

        next_module_text = ""
        if next_module:
            next_module_text = f"Next module: '{next_module.get('title','')}' — {next_module.get('description','')}"

        prompt = f"""You are an AI learning advisor generating a JSON report for a student.

Module just completed: "{module_title}"
Concepts covered: {concepts}
Test Score: {score}/100
Failed attempts before passing: {failed_attempts}
Learning goal: {goal_type}

Student profile:
- Explanation preference: {pref}
- Emotional state during session: {emotion}
- Question depth trend: {depth}
- Boredom score: {boredom}/10
- Confusion score: {confusion}/10

Recent conversation:
{history_text}

{next_module_text}

Generate the following. Return ONLY valid JSON with these 4 keys:

1. "concept_mastery": A JSON object mapping each concept name to an estimated mastery percentage (integer 0-100).
   The average of all concept scores should be close to {score}.
2. "learning_style_text": 3-4 plain English sentences describing this student's learning style.
3. "prereq_status": Either "ready" or "review".
4. "prereq_note": 2 sentences advising the student based on prereq_status.

Concept names must match exactly: {concepts}

JSON schema:
{{
    "concept_mastery": {{"Concept Name": 80, ...}},
    "learning_style_text": "...",
    "prereq_status": "ready",
    "prereq_note": "..."
}}"""

        try:
            response = self.llm.invoke([
                SystemMessage(content="You are a precise AI advisor. Output ONLY valid JSON."),
                HumanMessage(content=prompt)
            ])
            content = str(response.content)
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        except Exception as e:
            print(f"⚠️  Page 2 content generation failed: {e}")

        return {
            "concept_mastery": {c: score for c in concepts},
            "learning_style_text": "Balanced learning style.",
            "prereq_status": "ready" if score >= 75 else "review",
            "prereq_note": "Keep up the good work.",
        }

if __name__ == "__main__":
    pass
