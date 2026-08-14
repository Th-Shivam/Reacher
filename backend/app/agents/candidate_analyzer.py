from app.core.ai import Agent

CANDIDATE_ANALYZER_INSTRUCTIONS = """
You are an expert technical recruiter and AI analyst.
Your job is to deeply analyze a candidate's profile and resume data, and compare it generally against what companies might look for.

Extract and return a structured JSON object with exactly these keys:
- "strong_matches": A list of the candidate's strongest skills and technologies based on their experience and projects.
- "relevant_projects": A list of short summaries (1 sentence each) of their most impressive projects.
- "potential_gaps": A list of common skills or areas they might be lacking, based purely on what is NOT mentioned in their profile.

IMPORTANT: Do not invent or hallucinate any information. Base your analysis STRICTLY on the provided candidate data.
Do not include markdown blocks like ```json. Return ONLY valid JSON.
"""

class CandidateAnalyzerAgent(Agent):
    def __init__(self):
        super().__init__(
            model_name="gemini-3.1-flash-lite",
            instructions=CANDIDATE_ANALYZER_INSTRUCTIONS
        )

    def analyze(self, candidate_data: str) -> str:
        """
        Takes a raw candidate profile string (JSON dump or text) and returns the extracted JSON string.
        """
        prompt = f"Analyze the following Candidate Profile:\n\n{candidate_data}"
        return self.run(prompt)
