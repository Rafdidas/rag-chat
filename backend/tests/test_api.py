import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import httpx
from fastapi.testclient import TestClient
from openai import NotFoundError

from api.index import app
from backend.rag_api import get_openai_client


class AccessTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_missing_access_code_is_rejected(self):
        with patch.dict(os.environ, {"APP_ACCESS_CODE": "private-demo-code"}):
            response = self.client.post("/api/session")
        self.assertEqual(response.status_code, 401)

    def test_wrong_access_code_is_rejected(self):
        with patch.dict(os.environ, {"APP_ACCESS_CODE": "private-demo-code"}):
            response = self.client.post(
                "/api/session", headers={"X-App-Access-Code": "wrong"}
            )
        self.assertEqual(response.status_code, 401)

    def test_valid_access_code_is_accepted(self):
        with patch.dict(os.environ, {"APP_ACCESS_CODE": "private-demo-code"}):
            response = self.client.post(
                "/api/session", headers={"X-App-Access-Code": "private-demo-code"}
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

    def test_missing_server_access_code_is_unavailable(self):
        with patch.dict(os.environ, {}, clear=True):
            response = self.client.post("/api/session")
        self.assertEqual(response.status_code, 503)


class DocumentTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client_mock = Mock()
        app.dependency_overrides[get_openai_client] = lambda: self.client_mock
        self.environment = patch.dict(
            os.environ,
            {
                "APP_ACCESS_CODE": "private-demo-code",
                "OPENAI_VECTOR_STORE_ID": "vs_test",
            },
        )
        self.environment.start()
        self.headers = {"X-App-Access-Code": "private-demo-code"}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.environment.stop()

    def test_upload_registers_a_supported_document(self):
        self.client_mock.files.create.return_value = SimpleNamespace(id="file_123")
        self.client_mock.vector_stores.files.create.return_value = SimpleNamespace(
            id="file_123", status="in_progress"
        )
        response = self.client.post(
            "/api/documents",
            headers=self.headers,
            files={"file": ("notes.txt", b"hello world", "text/plain")},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["id"], "file_123")
        self.assertEqual(response.json()["status"], "in_progress")
        self.client_mock.files.create.assert_called_once()
        self.client_mock.vector_stores.files.create.assert_called_once_with(
            vector_store_id="vs_test", file_id="file_123"
        )

    def test_empty_document_is_rejected_before_openai_call(self):
        response = self.client.post(
            "/api/documents",
            headers=self.headers,
            files={"file": ("empty.txt", b"", "text/plain")},
        )
        self.assertEqual(response.status_code, 400)
        self.client_mock.files.create.assert_not_called()

    def test_unsupported_document_is_rejected_before_openai_call(self):
        response = self.client.post(
            "/api/documents",
            headers=self.headers,
            files={"file": ("program.exe", b"test", "application/octet-stream")},
        )
        self.assertEqual(response.status_code, 400)
        self.client_mock.files.create.assert_not_called()

    def test_oversized_document_is_rejected_before_openai_call(self):
        response = self.client.post(
            "/api/documents",
            headers=self.headers,
            files={"file": ("large.txt", b"x" * (4 * 1024 * 1024 + 1), "text/plain")},
        )
        self.assertEqual(response.status_code, 413)
        self.client_mock.files.create.assert_not_called()

    def test_list_returns_document_status_and_name(self):
        self.client_mock.vector_stores.files.list.return_value = [
            SimpleNamespace(id="file_123", status="completed")
        ]
        self.client_mock.files.retrieve.return_value = SimpleNamespace(
            filename="notes.txt", bytes=11
        )
        response = self.client.get("/api/documents", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["documents"],
            [{"id": "file_123", "name": "notes.txt", "status": "completed", "size": 11}],
        )

    def test_delete_removes_vector_file_and_original(self):
        response = self.client.delete("/api/documents/file_123", headers=self.headers)
        self.assertEqual(response.status_code, 204)
        self.client_mock.vector_stores.files.delete.assert_called_once_with(
            file_id="file_123", vector_store_id="vs_test"
        )
        self.client_mock.files.delete.assert_called_once_with("file_123")

    def test_list_skips_stale_vector_entry_after_file_deletion(self):
        self.client_mock.vector_stores.files.list.return_value = [
            SimpleNamespace(id="file_deleted", status="completed")
        ]
        request = httpx.Request("GET", "https://api.openai.com/v1/files/file_deleted")
        response = httpx.Response(404, request=request)
        self.client_mock.files.retrieve.side_effect = NotFoundError(
            "file missing", response=response, body=None
        )
        result = self.client.get("/api/documents", headers=self.headers)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["documents"], [])


class ChatTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client_mock = Mock()
        app.dependency_overrides[get_openai_client] = lambda: self.client_mock
        self.environment = patch.dict(
            os.environ,
            {"APP_ACCESS_CODE": "private-demo-code", "OPENAI_VECTOR_STORE_ID": "vs_test"},
        )
        self.environment.start()
        self.headers = {"X-App-Access-Code": "private-demo-code"}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.environment.stop()

    def test_retrieved_sources_are_sent_before_grounded_answer(self):
        self.client_mock.vector_stores.search.return_value = SimpleNamespace(
            data=[SimpleNamespace(
                file_id="file_123", filename="notes.txt", score=0.87,
                content=[SimpleNamespace(type="text", text="Paris is in France.")],
            )]
        )
        self.client_mock.chat.completions.create.return_value = iter([
            SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="Paris"))]),
            SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="입니다."))]),
        ])
        response = self.client.post(
            "/api/ask/stream", headers=self.headers, json={"question": "어디인가요?"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("event: sources", response.text)
        self.assertIn('"name": "notes.txt"', response.text)
        self.assertIn("event: delta", response.text)
        self.assertIn("Paris", response.text)
        self.assertIn("event: done", response.text)
        call = self.client_mock.chat.completions.create.call_args.kwargs
        self.assertIn("Paris is in France.", call["messages"][0]["content"])
        self.assertTrue(call["stream"])

    def test_no_relevant_source_does_not_call_model(self):
        self.client_mock.vector_stores.search.return_value = SimpleNamespace(data=[])
        response = self.client.post(
            "/api/ask/stream", headers=self.headers, json={"question": "없는 사실?"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("관련 내용을 찾지 못했습니다", response.text)
        self.client_mock.chat.completions.create.assert_not_called()

    def test_chat_requires_access_code(self):
        response = self.client.post("/api/ask/stream", json={"question": "hello"})
        self.assertEqual(response.status_code, 401)
        self.client_mock.vector_stores.search.assert_not_called()


if __name__ == "__main__":
    unittest.main()
