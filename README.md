# AI Chat Application (React + FastAPI)

문서 기반 AI 챗봇 구현을 목표로 한 풀스택 학습 프로젝트입니다.
React(Vite)와 FastAPI를 기반으로, 프론트엔드–백엔드–AI API를 연결하는 전체 흐름을 직접 구현했습니다.

현재 단계에서는 대화형 채팅 UI와 AI 질의응답 API 연동까지 완료했으며,
추후 문서 업로드 기반 RAG(Retrieval-Augmented Generation) 구조로 확장할 예정입니다.

### ✨주요 기능

##### 대화형 AI 채팅 UI
* 사용자 / AI 메시지 구분 렌더링
* 대화 기록 누적 표시
* 자동 스크롤 처리
* Enter 전송 / Shift+Enter 줄바꿈 지원

##### AI 질의응답 API
* FastAPI 기반 REST API (POST /ask)
* OpenAI API 연동
* 질문을 서버에서 처리하여 API Key 노출 방지

##### 개발 환경 최적화
* Vite proxy를 활용한 CORS 문제 해결
* 프론트엔드와 백엔드 완전 분리 구조

### 🛠️ 기술 스택
##### Frontend
* React
* TypeScript
* Vite

##### Backend
* Python
* FastAPI

##### AI
* OpenAI API

### 🏗️ 프로젝트 구조
```
rag-chatbot/
├─ frontend/        # React (Vite)
│  └─ src/
│     └─ App.tsx
├─ backend/         # FastAPI
│  ├─ step2_ask_ai.py
│  ├─ step3_api.py
│  └─ .env

```

### 🎯 프로젝트 목표
* AI API를 단순히 호출하는 것을 넘어
* 실제 서비스 구조에서 AI 기능을 어떻게 사용하는지를 이해
* 프론트엔드 관점에서 AI UX(응답 흐름, 체감 속도, 입력 경험) 개선
* 향후 문서 기반 RAG 챗봇으로 확장 가능한 구조 설계

### 🔖 참고
본 프로젝트는 학습 목적의 개인 프로젝트이며,
AI 기능을 실제 서비스에 적용하는 과정을 단계별로 구현하는 데 초점을 두었습니다.
