from app.core.ai import Agent
from app.agents.tools import search_budget, search_wikipedia, search_web

RESEARCH_INSTRUCTIONS = """
You are a highly capable Company Research Assistant.
Your job is to gather the most important and recent information about a given target company to help personalize a cold outreach email.
You have access to two tools:
1. `search_wikipedia`: Use this first to get a general understanding of the company, its mission, and what it does.
2. `search_web`: Use this to find recent news, tech stack, funding, or specific recent events about the company if Wikipedia is not enough or doesn't have it.

Your final output should be a concise summary (max 3-4 bullet points) covering:
- What the company actually does.
- Their tech stack or core product focus.
- Any recent news or major achievements (funding, product launch, etc.) that could be used as a hook in an email.

Do NOT include any extra conversational filler. Return just the bullet points.
"""

class ResearchAgent(Agent):
    def __init__(self):
        super().__init__(
            model_name="gemini-3.1-flash-lite",
            instructions=RESEARCH_INSTRUCTIONS,
            tools=[search_wikipedia, search_web]
        )

    def research(self, company_name: str) -> str:
        """
        Runs the research agent for the given company.
        """
        prompt = f"Please research this company: {company_name}"
        with search_budget():
            return self.run_with_tools(prompt)
