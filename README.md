# RAG LAB

개인 포트폴리오용 문서 기반 AI 채팅 앱입니다. React/Vite 프런트엔드와 FastAPI API를 한 Vercel 프로젝트에 배포합니다.

## 기능

- PDF/TXT/MD 업로드(파일당 최대 4MB), 처리 상태 확인, 삭제
- OpenAI vector store 검색 → 검색된 발췌문에 근거한 스트리밍 답변
- 답변에 사용한 출처와 발췌문 표시, 근거가 없을 때 답변 보류
- 서버 측 접근 코드 보호. OpenAI 키와 vector store ID는 브라우저에 전달하지 않음
- 다크 채팅 UI, 모바일 레이아웃, 모션/셰이더 배경

## 로컬 실행

Python 3.12 이상과 Node.js가 필요합니다.

1. `python -m pip install -r requirements-dev.txt`
2. `.env.example`을 참고하여 `backend/.env`에 `OPENAI_API_KEY`와 `APP_ACCESS_CODE`를 설정합니다. `backend/.env`는 Git에서 제외됩니다.
3. `python -m backend.create_vector_store`를 한 번 실행한 뒤 출력된 `OPENAI_VECTOR_STORE_ID`를 `backend/.env`에 추가합니다. 이 단계는 OpenAI 계정에 실제 vector store를 생성합니다.
4. `python -m uvicorn api.index:app --reload --port 8000`
5. 다른 터미널에서 `npm ci --prefix frontend`와 `npm run dev --prefix frontend` 실행. Vite 개발 서버의 주소로 접속합니다.

## 테스트

```bash
python -m unittest discover -s backend/tests -v
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

## Vercel 배포

프로젝트 루트를 Vercel에 연결하고 `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, `APP_ACCESS_CODE`를 환경 변수로 등록합니다. 이후 Preview 배포에서 로그인, 문서 업로드, 처리 완료, 질문/출처 표시를 확인하고 Production으로 배포합니다. `backend/.env`를 배포하거나 `VITE_` 접두사가 붙은 변수에 비밀값을 넣지 마세요.

배포 구성은 루트의 `vercel.json`, Python 진입점은 `api/index.py`입니다. 단일 개인용 접근 코드 방식이라 여러 사용자별 문서 분리는 제공하지 않습니다. 공개 포트폴리오에서 체험을 허용하려면 코드 공유 범위와 OpenAI 사용량을 직접 관리해야 합니다.
