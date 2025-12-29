import { useEffect, useRef, useState } from "react";
import './App.css';

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

  const askAi = async () => {
    const question = input.trim();
    if (!question || loading) return;

    // 1) 사용자 메시지 먼저 추가(즉시 화면에 보이게)
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: question,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 2) 백엔드 호출
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`서버 오류: ${res.status}`);
      }

      const data: { answer?: string } = await res.json();

      // 3) AI 메시지 추가
      const aiMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: data.answer ?? "(답변이 비어있습니다.)",
        createdAt: Date.now(),
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: `오류가 발생했습니다. ${e?.message ?? "알 수 없음"}`,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const askAiStream = async () => {
    const question = input.trim();
    if (!question || loading) return;

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

    try {
      const res = await fetch("/api/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: `오류가 발생했습니다: ${e?.message ?? "알 수 없음"}` }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      {/* <h1 style={{ marginBottom: 16 }}>AI 채팅 테스트</h1> */}

      {/* 채팅 영역 */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 12,
          minWidth:500,
          minHeight: 360,
          maxHeight: 520,
          overflow: "auto",
          background: "#fafafa",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: "#666" }}>첫 질문을 입력해보세요.</div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e3e3e3",
                  background: m.role === "user" ? "white" : "#fff",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#888",
                    marginBottom: 4,
                    textAlign: m.role === "user" ? "right" : "left",
                  }}
                >
                  {m.role === "user" ? "나" : "AI"}
                </div>
                <div
                  style={{
                    textAlign: m.role === "user" ? "right" : "left",
                  }}
                >
                  {m.content}
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ color: "#666", marginTop: 8 }}>AI가 답변을 작성 중...</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요"
          rows={2}
          style={{
            flex: 1,
            padding: 10,
            resize: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); // 줄바꿈 막기
              askAiStream();
            }
          }}
        />
        <button onClick={askAiStream} disabled={loading || !input.trim()}>
          {loading ? "전송 중..." : "전송"}
        </button>
      </div>
    </div>
  );
}

export default App;