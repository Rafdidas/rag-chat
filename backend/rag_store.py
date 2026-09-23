from pathlib import PurePath

from openai import OpenAI
from openai import NotFoundError

MAX_UPLOAD_BYTES = 4 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
}


def safe_filename(filename: str) -> str:
    return filename.replace("\\", "/").split("/")[-1].strip()


def list_documents(client: OpenAI, store_id: str) -> list[dict]:
    documents = []
    for vector_file in client.vector_stores.files.list(vector_store_id=store_id):
        try:
            uploaded_file = client.files.retrieve(vector_file.id)
        except NotFoundError:
            # Vector-store listings can briefly retain a deleted file.
            continue
        documents.append(
            {
                "id": vector_file.id,
                "name": uploaded_file.filename,
                "status": vector_file.status,
                "size": uploaded_file.bytes,
            }
        )
    return documents


def add_document(client: OpenAI, store_id: str, filename: str, payload: bytes) -> dict:
    uploaded_file = client.files.create(
        file=(filename, payload, ALLOWED_MIME_TYPES[PurePath(filename).suffix.lower()]),
        purpose="assistants",
    )
    try:
        vector_file = client.vector_stores.files.create(
            vector_store_id=store_id, file_id=uploaded_file.id
        )
    except Exception:
        client.files.delete(uploaded_file.id)
        raise
    return {
        "id": uploaded_file.id,
        "name": filename,
        "status": vector_file.status,
        "size": len(payload),
    }


def delete_document(client: OpenAI, store_id: str, file_id: str) -> None:
    client.vector_stores.files.delete(file_id=file_id, vector_store_id=store_id)
    client.files.delete(file_id)
