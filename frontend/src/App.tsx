import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, CircleStop, Send, Sparkles, UserRound } from "lucide-react";
import "highlight.js/styles/github-dark.css";

import "./App.css";
import "./css/chat.css";
import { MarkdownContent } from "./components/MarkdownContent";

const ShaderBackdrop = lazy(() =>
  import("./components/ShaderBackdrop").then((module) => ({
    default: module.ShaderBackdrop,
  })),
);

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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류";
}

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const askAiStream = async () => {
    const question = input.trim();
    if (!question || loading) return;

    abortRef.current?.abort();

    const aiMsgId = uid();
    const now = Date.now();
    setMessages((previous) => [
      ...previous,
      { id: uid(), role: "user", content: question, createdAt: now },
      { id: aiMsgId, role: "assistant", content: "", createdAt: now },
    ]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`서버 오류: ${response.status}${details ? ` ${details}` : ""}`);
      }

      if (!response.body) throw new Error("스트림을 읽을 수 없습니다.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((previous) =>
          previous.map((message) =>
            message.id === aiMsgId
              ? { ...message, content: message.content + chunk }
              : message,
          ),
        );
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessages((previous) =>
          previous.map((message) =>
            message.id === aiMsgId
              ? { ...message, content: `${message.content}\n\n_응답이 중단되었습니다._` }
              : message,
          ),
        );
        return;
      }

      setMessages((previous) =>
        previous.map((message) =>
          message.id === aiMsgId
            ? { ...message, content: `오류가 발생했습니다: ${getErrorMessage(error)}` }
            : message,
        ),
      );
    } finally {
      setLoading(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void askAiStream();
  };

  const stopStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="app-shell">
      <Suspense fallback={<div className="shader-backdrop" aria-hidden="true" />}>
        <ShaderBackdrop />
      </Suspense>

      <header className="app-header">
        <div className="brand" aria-label="RAG LAB 홈">
          <span className="brand__mark"><Sparkles size={17} /></span>
          <span>RAG LAB</span>
        </div>
        <div className="live-status">
          <span className="live-status__dot" />
          실시간 응답
        </div>
      </header>

      <main className="chat-layout">
        <section className={`chat-feed ${messages.length === 0 ? "chat-feed--empty" : ""}`} aria-live="polite">
          {messages.length === 0 ? (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="empty-state__icon"><Sparkles size={24} /></span>
              <h1>문서와 대화하세요</h1>
              <p>질문을 입력하면 AI가 답변을 실시간으로 작성합니다.</p>
            </motion.div>
          ) : (
            <div className="message-list">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.article
                    className={`message message--${message.role}`}
                    key={message.id}
                    initial={{ opacity: 0, y: 12, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="message__avatar" aria-hidden="true">
                      {message.role === "user" ? <UserRound size={17} /> : <Bot size={18} />}
                    </div>
                    <div className="message__content">
                      {message.content ? (
                        <MarkdownContent content={message.content} />
                      ) : (
                        <span className="streaming-dots" aria-label="AI가 답변을 작성 중">
                          <i /><i /><i />
                        </span>
                      )}
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
          <div ref={bottomRef} />
        </section>

        <form className="composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="chat-input">질문</label>
          <textarea
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="질문을 입력하세요"
            rows={1}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void askAiStream();
              }
            }}
          />
          <span className="composer__hint">Shift + Enter로 줄바꿈</span>
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.button
                key="stop"
                className="composer__action composer__action--stop"
                type="button"
                onClick={stopStream}
                aria-label="응답 중단"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
              >
                <CircleStop size={18} />
                <span>중단</span>
              </motion.button>
            ) : (
              <motion.button
                key="send"
                className="composer__action"
                type="submit"
                disabled={!input.trim()}
                aria-label="메시지 전송"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
              >
                <Send size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </form>
      </main>
    </div>
  );
}

export default App;
