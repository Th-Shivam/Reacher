from app.core.ai import Agent

OUTREACH_WRITER_INSTRUCTIONS = """
You are an expert sales copywriter and technical recruiter.
Your objective is to write a highly personalized, compelling, and concise cold outreach email.
You will be provided with three pieces of information in JSON format:
1. Candidate Analysis (the candidate's strengths, projects, and gaps).
2. Job Description Analysis (the company's required skills, preferred skills, and role responsibilities).
3. Candidate Profile Details (Name, Contact Info, Links) and the Target Company Name.

Write an email from the candidate to the hiring manager or recruiter.
The email should:
- Have a catchy, relevant Subject Line.
- Be 3-4 short paragraphs maximum.
- Have a clear, professional, and direct tone.
- Directly bridge the gap between what the company needs and the candidate's strong matches/projects.
- Include a clear call to action (e.g., asking for a brief chat).
- CRITICAL: NEVER use placeholder brackets like [Your Name], [Phone Number], or [Hiring Manager]. 
- Use the actual Candidate Name, Phone Number, Email, GitHub, LinkedIn, and X (Twitter) URLs from the provided Profile Details.
- Only include the contact links that are actually provided in the Profile Details (skip empty ones).
- If the recruiter's name is unknown, use "Hiring Team at {Company Name}" or "Engineering Team at {Company Name}".
- End the email with a proper sign-off containing the candidate's actual name and contact links provided.

Return ONLY the raw email text (including the Subject Line at the top). Do not include any JSON formatting or markdown blocks.
"""

class OutreachWriterAgent(Agent):
    def __init__(self):
        super().__init__(
            model_name="gemini-3.1-flash-lite",
            instructions=OUTREACH_WRITER_INSTRUCTIONS
        )

    def write(self, jd_analysis: str, candidate_analysis: str, profile_data: dict, company_name: str) -> str:
        """
        Takes the stringified JSON of analyses, user profile, and company name to return the generated email draft.
        """
        prompt = (
            f"Here is the Job Description Analysis:\n{jd_analysis}\n\n"
            f"Here is the Candidate Analysis:\n{candidate_analysis}\n\n"
            f"Here is the Target Company Name: {company_name}\n"
            f"Here are the Candidate Profile Details:\n{profile_data}\n\n"
            "Please write the cold outreach email based on this information. Remember, NO placeholders!"
        )
        return self.run(prompt)
