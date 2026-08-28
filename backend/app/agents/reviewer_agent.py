import json
from app.core.ai import Agent

REVIEWER_INSTRUCTIONS = """
You are a highly critical, expert Email Reviewer for cold outreach.
Your job is to evaluate a generated email draft against the Job Description and provide constructive feedback.

You will receive:
1. The Job Description.
2. The Generated Draft.

You MUST return a JSON object with EXACTLY the following keys:
- "score": An integer from 0 to 10 (10 being perfect).
- "tone_analysis": A short sentence evaluating the tone (e.g. 'Too desperate', 'Professional and confident').
- "length_analysis": A short sentence evaluating the length (e.g. 'Perfectly concise', 'A bit too long').
- "alignment_analysis": A short sentence evaluating how well the email matches the core skills from the JD.
- "overall_feedback": 1-2 sentences of actionable advice to improve the email.

Do NOT include any markdown formatting like ```json. Return ONLY valid JSON.
"""

class ReviewerAgent(Agent):
    def __init__(self):
        super().__init__(
            model_name="gemini-3.1-flash-lite",
            instructions=REVIEWER_INSTRUCTIONS
        )

    def review(self, job_description: str, draft: str) -> str:
        """
        Takes the job description and generated draft and returns the extracted JSON string.
        """
        prompt = (
            f"Here is the Job Description:\n{job_description}\n\n"
            f"Here is the Generated Draft:\n{draft}\n\n"
            "Please review this draft and provide the JSON feedback."
        )
        return self.run(prompt)
