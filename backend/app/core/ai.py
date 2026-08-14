import os
from google import genai

# We will initialize the client when it's imported, 
# ensuring the GEMINI_API_KEY environment variable is present.
def get_ai_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return genai.Client(api_key=api_key)

class Agent:
    """
    Base class representing an AI Agent.
    Every agent needs:
    - a client (the provider)
    - a model (the brain)
    - instructions (the system prompt)
    """
    def __init__(self, model_name: str, instructions: str, tools: list = None):
        self.client = get_ai_client()
        self.model_name = model_name
        self.instructions = instructions
        self.tools = tools

    def run(self, prompt: str) -> str:
        """
        Executes the agent with the given prompt.
        """
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=self.instructions,
            )
        )
        return response.text

    def run_with_tools(self, prompt: str) -> str:
        """
        Executes the agent using a chat session to support automatic function calling.
        """
        chat = self.client.chats.create(
            model=self.model_name,
            config=genai.types.GenerateContentConfig(
                system_instruction=self.instructions,
                tools=self.tools,
            )
        )
        response = chat.send_message(prompt)
        return response.text
