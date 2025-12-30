import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import './App.css';
import './css/chat.css';

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);

  // const askAi = async () => {
  //   const question = input.trim();
  //   if (!question || loading) return;

  //   // 1) 사용자 메시지 먼저 추가(즉시 화면에 보이게)
  //   const userMsg: ChatMessage = {
  //     id: uid(),
  //     role: "user",
  //     content: question,
  //     createdAt: Date.now(),
  //   };

  //   setMessages((prev) => [...prev, userMsg]);
  //   setInput("");
  //   setLoading(true);

  //   try {
  //     // 2) 백엔드 호출
  //     const res = await fetch("/api/ask", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ question }),
  //     });

  //     if (!res.ok) {
  //       throw new Error(`서버 오류: ${res.status}`);
  //     }

  //     const data: { answer?: string } = await res.json();

  //     // 3) AI 메시지 추가
  //     const aiMsg: ChatMessage = {
  //       id: uid(),
  //       role: "assistant",
  //       content: data.answer ?? "(답변이 비어있습니다.)",
  //       createdAt: Date.now(),
  //     };
      
  //     setMessages((prev) => [...prev, aiMsg]);
  //   } catch (e: any) {
  //     const errMsg: ChatMessage = {
  //       id: uid(),
  //       role: "assistant",
  //       content: `오류가 발생했습니다. ${e?.message ?? "알 수 없음"}`,
  //       createdAt: Date.now(),
  //     };
  //     setMessages((prev) => [...prev, errMsg]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const askAiStream = async () => {
    const question = input.trim();
    if (!question || loading) return;

    abortRef.current?.abort();

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: question,
      createdAt: Date.now(),
    };

    const aiMsgId = uid();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    streamingMsgIdRef.current = aiMsgId;

    try {
      const res = await fetch("/api/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`서버 오류: ${res.status} ${text}`);
      }

      if (!res.body) throw new Error("스트림을 읽을 수 없습니다.");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, content: m.content + chunk } : m))
        );
      }
    } catch (e: any) {
      // 사용자가 '중단'을 누른 경우: 오류가 아니라 정상 흐름으로 처리
      if (e?.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: m.content + "\n\n(중단됨)" } : m
          )
        );
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: `오류가 발생했습니다: ${e?.message ?? "알 수 없음"}` }
            : m
        )
      );
    } finally {
      setLoading(false);

      // 정리(현재 요청이 끝났으니 controller/ref 비우기)
      if (abortRef.current === controller) {
        abortRef.current = null;
        streamingMsgIdRef.current = null;
      }
    }
  };

  const stopStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-wrap">
      {/* <h1 className="main-title">🚀</h1> */}
      {/* 채팅 영역 */}
      <div className={`chat-area ${messages.length === 0 && "chat-area--empty"}`}>
        <div className="chat-area--inner">
          {messages.length === 0 ? (
            <div className="empty-message">첫 질문을 입력해보세요.</div>
          ) : (
            messages.map((m) => (
              <div
                className="chat-message"
                key={m.id}
                style={{
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div className="chat-message--card">
                  <div
                    className="chat-message--user"
                    style={{
                      textAlign: m.role === "user" ? "right" : "left",
                    }}
                  >
                    {m.role === "user" ? "😊" : "🤖"}
                  </div>
                  <div
                    className="markdown"
                    style={{
                      textAlign: m.role === "user" ? "right" : "left",
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="loading" style={{ color: "#666", marginTop: 8 }}>
              AI가 답변을 작성 중...
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); // 줄바꿈 막기
              askAiStream();
            }
          }}
        />
        <button
          className="chat-button"
          onClick={askAiStream}
          disabled={loading || !input.trim()}
        >
          {loading ? "전송 중..." : "전송"}
        </button>
        <button
          className="chat-button"
          type="button"
          onClick={stopStream}
          disabled={!loading}
        >
          중단
        </button>
      </div>
    </div>
  );
}

export default App;