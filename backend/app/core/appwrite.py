import os
from appwrite.client import Client
from appwrite.services.storage import Storage

# Only initialize if the env vars exist (to not crash if missing during dev)
appwrite_client = Client()

if os.environ.get("APPWRITE_ENDPOINT") and os.environ.get("APPWRITE_PROJECT_ID") and os.environ.get("APPWRITE_API_KEY"):
    appwrite_client.set_endpoint(os.environ["APPWRITE_ENDPOINT"])
    appwrite_client.set_project(os.environ["APPWRITE_PROJECT_ID"])
    appwrite_client.set_key(os.environ["APPWRITE_API_KEY"])

appwrite_storage = Storage(appwrite_client)
