"""Opt-in end-to-end smoke check against a real OpenAI vector store."""

import os
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi.testclient import TestClient

from api.index import app


def main() -> None:
    load_dotenv(Path(__file__).with_name(".env"))
    code = os.environ["APP_ACCESS_CODE"]
    headers = {"X-App-Access-Code": code}
    client = TestClient(app)
    document_id = None
    try:
        response = client.post(
            "/api/documents",
            headers=headers,
            files={"file": ("smoke-test.txt", b"The RAG LAB mascot is a violet otter named Miro.", "text/plain")},
        )
        response.raise_for_status()
        document_id = response.json()["id"]
        for _ in range(20):
            documents = client.get("/api/documents", headers=headers)
            documents.raise_for_status()
            found = next((d for d in documents.json()["documents"] if d["id"] == document_id), None)
            if not found:
                time.sleep(2)
                continue
            status = found["status"]
            if status == "completed":
                break
            if status == "failed":
                raise RuntimeError("Vector indexing failed")
            time.sleep(2)
        else:
            raise RuntimeError("Vector indexing timed out")
        answer = client.post(
            "/api/ask/stream",
            headers=headers,
            json={"question": "What is the RAG LAB mascot's name?"},
        )
        answer.raise_for_status()
        if "Miro" not in answer.text or "event: sources" not in answer.text:
            raise RuntimeError("Grounded response or source missing")
        print("LIVE_RAG_SMOKE_OK")
    finally:
        if document_id:
            cleanup = client.delete(f"/api/documents/{document_id}", headers=headers)
            cleanup.raise_for_status()


if __name__ == "__main__":
    main()
