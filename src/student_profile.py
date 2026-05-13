import json
import os
from datetime import datetime
from typing import Dict, Any, Optional

class StudentProfileManager:
    """
    Manages the long-term, cross-session psychological profile of the student.
    Tracks velocity, boredom, explanation preference, depth, and emotion.
    """
    def __init__(self, session_id: str = "default_session"):
        self.session_id = session_id
        self.db_path = f"./data/{self.session_id}_profile.json"
        self._ensure_db_exists()

    def _ensure_db_exists(self):
        if not os.path.exists("./data"):
            os.makedirs("./data")
        if not os.path.exists(self.db_path):
            default_profile = {
                "learning_velocity": "medium",
                "boredom_score": 0,
                "confusion_score": 0,
                "explanation_preference": "balance",
                "question_depth_trend": "shallow",
                "emotional_state": "neutral",
                "spaced_repetition_flags": [],
                "pretend_understanding_flags": 0,
                "session_engagement": {
                    "total_messages": 0
                },
                # ── Module History & Progress Tracking ──
                "module_history": [],       # One entry per passed module
                "streak": 0,               # Consecutive passing modules
                "average_mastery": 0.0     # Rolling average of all module scores
            }
            self.save_profile(default_profile)

    def load_profile(self) -> Dict[str, Any]:
        with open(self.db_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_profile(self, profile: Dict[str, Any]):
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(profile, f, indent=4)
            
    def update_metrics(self, new_metrics: Dict[str, Any]):
        """
        Merges new insights from the InsightNode into the persistent profile.
        """
        profile = self.load_profile()
        
        # Update scalar/string metrics
        for key in ["learning_velocity", "explanation_preference", "question_depth_trend", "emotional_state"]:
            if key in new_metrics:
                profile[key] = new_metrics[key]
                
        # Update accumulating metrics
        for key in ["boredom_score", "confusion_score", "pretend_understanding_flags"]:
            if key in new_metrics:
                profile[key] = new_metrics[key]
                
        # Append spacing flags
        if "spaced_repetition_flags" in new_metrics and isinstance(new_metrics["spaced_repetition_flags"], list):
            for concept in new_metrics["spaced_repetition_flags"]:
                if concept not in profile["spaced_repetition_flags"]:
                    profile["spaced_repetition_flags"].append(concept)
                    
        self.save_profile(profile)

    def record_module_completion(self, module: Dict[str, Any], score: int, failed_attempts: int):
        """
        Records a module that the student has just passed.
        Updates module_history, streak, and average_mastery automatically.

        Args:
            module:          The module dict from curriculum (title, module_id, concepts).
            score:           The final test score (0-100) the student passed with.
            failed_attempts: How many times they failed before passing.
        """
        profile = self.load_profile()

        record = {
            "module_id":       module.get("module_id", ""),
            "title":           module.get("title", "Unknown Module"),
            "score":           score,
            "failed_attempts": failed_attempts,
            "concepts_count":  len(module.get("concepts", [])),
            "passed_at":       datetime.now().strftime("%Y-%m-%d %H:%M")
        }

        # Append to history
        history: list = profile.get("module_history", [])
        history.append(record)
        profile["module_history"] = history

        # Recompute average mastery across all passed modules
        all_scores = [r["score"] for r in history]
        profile["average_mastery"] = round(sum(all_scores) / len(all_scores), 1)

        # Recompute streak (consecutive modules where score >= 70)
        streak = 0
        for r in reversed(history):
            if r["score"] >= 70:
                streak += 1
            else:
                break
        profile["streak"] = streak

        self.save_profile(profile)
        print(f"📊 Module '{record['title']}' recorded. Streak: {streak} | Avg Mastery: {profile['average_mastery']}%")

    def get_last_module_score(self) -> Optional[int]:
        """
        Returns the score from the previous module, or None if this is the first.
        Used to compute the delta comparison on the report card.
        """
        profile = self.load_profile()
        history = profile.get("module_history", [])
        if len(history) < 2:
            return None
        # Second-to-last is the previous module (last is the one just recorded)
        return history[-2]["score"]

if __name__ == "__main__":
    db = StudentProfileManager()
    print("Initial Profile:", db.load_profile())
    db.update_metrics({
        "emotional_state": "confident", 
        "explanation_preference": "analogy",
        "boredom_score": 2,
        "confusion_score": 1
    })
    print("Updated Profile:", db.load_profile())
