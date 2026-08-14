from app.core.ai import Agent

JD_ANALYZER_INSTRUCTIONS = """
You are an expert technical recruiter and AI analyst.
Your job is to deeply analyze Job Descriptions (JDs) and extract key information.

Extract and return a structured JSON object with exactly these keys:
- "required_skills": A list of must-have technical skills.
- "preferred_skills": A list of nice-to-have or bonus technical skills.
- "responsibilities": A list of the main duties of the role.
- "role_level": The seniority level (e.g., Junior, Mid, Senior, Lead).
- "keywords": A list of important buzzwords or domain terms found in the text.

Do not include markdown blocks like ```json. Return ONLY valid JSON.
"""

class JDAnalyzerAgent(Agent):
    def __init__(self):
        super().__init__(
            model_name="gemini-3.1-flash-lite",
            instructions=JD_ANALYZER_INSTRUCTIONS
        )

    def analyze(self, job_description: str) -> str:
        """
        Takes a raw job description string and returns the extracted JSON string.
        """
        prompt = f"Analyze the following Job Description:\n\n{job_description}"
        return self.run(prompt)
