import os
import secrets
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel, Field

from backend.rag_chat import retrieve_sources, sse, stream_grounded_answer

from backend.rag_store import (
    ALLOWED_MIME_TYPES,
    MAX_UPLOAD_BYTES,
    add_document,
    delete_document,
    list_documents,
    safe_filename,
)

load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(title="RAG LAB API")


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key is not configured")
    return OpenAI(api_key=api_key)


def get_vector_store_id() -> str:
    store_id = os.getenv("OPENAI_VECTOR_STORE_ID")
    if not store_id:
        raise HTTPException(status_code=503, detail="Vector store is not configured")
    return store_id


def require_access_code(
    x_app_access_code: str | None = Header(default=None),
) -> None:
    expected = os.getenv("APP_ACCESS_CODE")
    if not expected:
        raise HTTPException(status_code=503, detail="Access code is not configured")
    if not x_app_access_code or not secrets.compare_digest(
        x_app_access_code, expected
    ):
        raise HTTPException(status_code=401, detail="Invalid access code")


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/session", dependencies=[Depends(require_access_code)])
def verify_session():
    return {"ok": True}


@app.get("/api/documents", dependencies=[Depends(require_access_code)])
def get_documents(client: OpenAI = Depends(get_openai_client)):
    return {"documents": list_documents(client, get_vector_store_id())}


@app.post("/api/documents", status_code=201, dependencies=[Depends(require_access_code)])
async def upload_document(
    file: UploadFile = File(...), client: OpenAI = Depends(get_openai_client)
):
    filename = safe_filename(file.filename or "")
    if not filename or Path(filename).suffix.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="PDF, TXT, MD 파일만 업로드할 수 있습니다")
    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없습니다")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="파일은 최대 4MB입니다")
    return add_document(client, get_vector_store_id(), filename, payload)


@app.delete(
    "/api/documents/{file_id}", status_code=204, dependencies=[Depends(require_access_code)]
)
def remove_document(file_id: str, client: OpenAI = Depends(get_openai_client)):
    delete_document(client, get_vector_store_id(), file_id)


@app.post("/api/ask/stream", dependencies=[Depends(require_access_code)])
def ask_stream(request: AskRequest, client: OpenAI = Depends(get_openai_client)):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Question cannot be empty")
    sources = retrieve_sources(client, get_vector_store_id(), question)

    def events():
        yield sse("sources", {"sources": sources})
        if not sources:
            yield sse("delta", {"text": "문서에서 질문과 관련 내용을 찾지 못했습니다."})
            yield sse("done", {})
            return
        try:
            for text in stream_grounded_answer(client, question, sources):
                yield sse("delta", {"text": text})
        except Exception:
            yield sse("error", {"message": "답변 생성 중 오류가 발생했습니다."})
        yield sse("done", {})

    return StreamingResponse(
        events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )
