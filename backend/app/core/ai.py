import os
from google import genai
from app.core.security import env_int

# We will initialize the client when it's imported, 
# ensuring the GEMINI_API_KEY environment variable is present.
def get_ai_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return genai.Client(
        api_key=api_key,
        http_options=genai.types.HttpOptions(
            timeout=env_int("AI_REQUEST_TIMEOUT_SECONDS", 60) * 1000,
        ),
    )

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
                max_output_tokens=env_int("AI_MAX_OUTPUT_TOKENS", 4096),
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
                max_output_tokens=env_int("AI_MAX_OUTPUT_TOKENS", 4096),
                automatic_function_calling=genai.types.AutomaticFunctionCallingConfig(
                    maximum_remote_calls=env_int("MAX_WEB_SEARCHES_PER_RESEARCH", 2) + 1,
                ),
            )
        )
        response = chat.send_message(prompt)
        return response.text
