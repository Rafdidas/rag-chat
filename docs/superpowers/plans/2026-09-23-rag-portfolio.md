# RAG LAB Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a password-gated, document-grounded RAG chat on Vercel.

**Architecture:** A FastAPI app under `api/index.py` serves `/api/*`. OpenAI vector stores retain and index documents; the server searches them and streams grounded model output as SSE. The Vite client handles access code, uploads, document states, chat, and sources.

**Tech Stack:** Python 3.12, FastAPI, OpenAI Python SDK, pytest, React 19, TypeScript, Vite, Vitest, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-23-rag-portfolio-design.md`

## Global Constraints

- Single-owner portfolio MVP; no multi-user accounts.
- PDF, TXT, Markdown uploads up to 4MB.
- `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, and `APP_ACCESS_CODE` stay server-side.
- All `/api/*` data endpoints require `X-App-Access-Code`.
- Preserve responsive dark chat UI and stream cancellation.

## Review Focus

- Missing or wrong access code returns 401 without calling OpenAI.
- Empty, unsupported, or oversized files return 400 or 413 before upload.
- No indexed documents returns a clear response instead of an ungrounded answer.
- Partial SSE chunks still parse and display source and delta events.
- Deleting a document removes the indexed association and reports eventual consistency.

---

### Task 1: Authenticated FastAPI core

**Files:** Create `api/index.py`, `backend/rag_api.py`, `backend/requirements.txt`, `backend/tests/test_api.py`.

**Interfaces:** `app: FastAPI`; `require_access_code(x_app_access_code: str | None) -> None`; `GET /api/health`; `POST /api/session`.

- [ ] **Step 1: Write failing auth tests.** Use `TestClient(app)` to assert missing/wrong code returns 401 on `/api/session`, valid code returns 200, and missing `APP_ACCESS_CODE` returns 503.
- [ ] **Step 2: Run `python -m pytest backend/tests/test_api.py -q`; confirm the missing app or failing assertions.**
- [ ] **Step 3: Implement dependency using `secrets.compare_digest`, environment reads at request time, and export `app` from `api/index.py`.**
- [ ] **Step 4: Run the test and confirm green.**

### Task 2: Document management

**Files:** Create `backend/rag_store.py`; extend `backend/rag_api.py`, `backend/tests/test_api.py`.

**Interfaces:** `list_documents(client, store_id) -> list[dict]`, `add_document(client, store_id, filename, payload) -> dict`, `delete_document(client, store_id, file_id) -> None`; `GET/POST /api/documents`, `DELETE /api/documents/{file_id}`.

- [ ] **Step 1: Add failing tests for valid upload, empty file, bad extension, >4MB body, list statuses, and deletion.** Mock only the OpenAI network boundary; assert exact HTTP responses and file IDs.
- [ ] **Step 2: Run the focused tests; confirm failures reflect missing behavior.**
- [ ] **Step 3: Implement size/type validation, OpenAI file upload plus vector-store indexing, list and delete.** Keep the vector store ID in the environment and return 503 when absent.
- [ ] **Step 4: Run tests and confirm green.**

### Task 3: Grounded streaming answer

**Files:** Create `backend/rag_chat.py`; extend `backend/rag_api.py`, `backend/tests/test_api.py`.

**Interfaces:** `search_sources(client, store_id, question) -> list[dict]`, `stream_answer(client, question, sources) -> Iterator[str]`; `POST /api/ask/stream` returns SSE `sources`, `delta`, `done`, `error` events.

- [ ] **Step 1: Add failing tests for no documents, search results with filenames/snippets, grounded prompt, SSE deltas, and upstream errors.**
- [ ] **Step 2: Run focused tests and observe expected failures.**
- [ ] **Step 3: Search vector store, construct numbered context with an explicit untrusted-data instruction, stream `gpt-4.1-mini` text, encode SSE JSON.**
- [ ] **Step 4: Run tests and confirm green.**

### Task 4: React access and document UI

**Files:** Create `frontend/src/lib/api.ts`, `frontend/src/components/DocumentPanel.tsx`; modify `frontend/src/App.tsx`, `frontend/src/css/chat.css`; extend `frontend/src/App.test.tsx`.

**Interfaces:** `verifyAccess(code)`, `listDocuments(code)`, `uploadDocument(code,file)`, `deleteDocument(code,id)`, `streamAnswer(code,question,signal,onEvent)`; `DocumentPanel` receives documents and actions.

- [ ] **Step 1: Add failing UI tests for access code, upload state, document list/delete, and server error.**
- [ ] **Step 2: Run `npm test -- --run src/App.test.tsx` and observe expected failures.**
- [ ] **Step 3: Implement session-scoped code, accessible document panel, 4MB client validation, status indicators, and responsive styling.**
- [ ] **Step 4: Run focused tests and confirm green.**

### Task 5: SSE chat and sources

**Files:** Modify `frontend/src/App.tsx`, `frontend/src/css/chat.css`, `frontend/src/lib/api.ts`, `frontend/src/App.test.tsx`.

**Interfaces:** `streamAnswer` parses split SSE frames and reports typed `sources`, `delta`, `done`, `error` events; message state includes sources.

- [ ] **Step 1: Add failing parser and UI tests for split chunks, source display, streamed text, stop action.**
- [ ] **Step 2: Run focused tests and observe failures.**
- [ ] **Step 3: Implement SSE reader and source presentation while keeping Markdown and cancellation.**
- [ ] **Step 4: Run tests and confirm green.**

### Task 6: Deployment and verification

**Files:** Create `vercel.json`, `requirements.txt`, `.vercelignore`, `.env.example`; modify `README.md`, `frontend/index.html` as needed.

**Interfaces:** Vercel build emits `frontend/dist` and routes `/api/*` to `api/index.py`.

- [ ] **Step 1: Add a deployment smoke check that imports `api.index.app` and checks an authenticated API route with `TestClient`.**
- [ ] **Step 2: Verify it fails until routing and dependencies are present.**
- [ ] **Step 3: Add Vercel build/routing config and document the exact environment variables and one-time vector store setup.**
- [ ] **Step 4: Run Python tests, frontend tests, lint, build, and browser QA at desktop and mobile sizes.**
- [ ] **Step 5: Check Vercel account access, configure project secrets and vector store, deploy preview, verify deployed frontend/API/upload/chat, then promote to production if the preview works.**
