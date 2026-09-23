"""Create the one-time OpenAI vector store for the private portfolio demo."""

from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


def main() -> None:
    load_dotenv(Path(__file__).with_name(".env"))
    store = OpenAI().vector_stores.create(name="RAG LAB portfolio")
    print(f"OPENAI_VECTOR_STORE_ID={store.id}")


if __name__ == "__main__":
    main()
