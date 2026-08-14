from app.core.ai import Agent

OUTREACH_WRITER_INSTRUCTIONS = """
You are an expert sales copywriter and technical recruiter.
Your objective is to write a highly personalized, compelling, and concise cold outreach email.
You will be provided with two pieces of information in JSON format:
1. Candidate Analysis (the candidate's strengths, projects, and gaps).
2. Job Description Analysis (the company's required skills, preferred skills, and role responsibilities).

Write an email from the candidate to the hiring manager or recruiter.
The email should:
- Have a catchy, relevant Subject Line.
- Be 3-4 short paragraphs maximum.
- Have a clear, professional, and direct tone.
- Directly bridge the gap between what the company needs and the candidate's strong matches/projects.
- Include a clear call to action (e.g., asking for a brief chat).
- Leave placeholders like [Hiring Manager Name] if you don't know the exact name.
- NOT sound overly robotic or excessively formal. Keep it human.

Return ONLY the raw email text (including the Subject Line at the top). Do not include any JSON formatting or markdown blocks.
"""

class OutreachWriterAgent(Agent):
    def __init__(self):
        super().__init__(
            model_name="gemini-3.1-flash-lite",
            instructions=OUTREACH_WRITER_INSTRUCTIONS
        )

    def write(self, jd_analysis: str, candidate_analysis: str) -> str:
        """
        Takes the stringified JSON of both analyses and returns the generated email draft.
        """
        prompt = (
            f"Here is the Job Description Analysis:\n{jd_analysis}\n\n"
            f"Here is the Candidate Analysis:\n{candidate_analysis}\n\n"
            "Please write the cold outreach email based on this information."
        )
        return self.run(prompt)
