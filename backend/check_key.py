import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("OPENAI_API_KEY", "")
print("loaded:", bool(key), "len:", len(key))
