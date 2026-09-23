import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, CircleStop, Files, LockKeyhole, LogOut, Send, Sparkles, UserRound } from "lucide-react";
import "highlight.js/styles/github-dark.css";

import "./App.css";
import "./css/chat.css";
import { MarkdownContent } from "./components/MarkdownContent";
import { DocumentPanel } from "./components/DocumentPanel";
import { streamAnswer, verifyCode, type Source } from "./lib/api";

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
  sources?: Source[];
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
  const [accessCode, setAccessCode] = useState(() => sessionStorage.getItem("rag-access-code") || "");
  const [codeInput, setCodeInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!accessCode) return;
    void verifyCode(accessCode).then(() => setAuthenticated(true)).catch(() => {
      sessionStorage.removeItem("rag-access-code");
      setAccessCode("");
      setAuthenticated(false);
    });
  }, [accessCode]);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    const code = codeInput.trim();
    if (!code) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      await verifyCode(code);
      sessionStorage.setItem("rag-access-code", code);
      setAccessCode(code);
      setAuthenticated(true);
      setCodeInput("");
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = () => {
    abortRef.current?.abort();
    sessionStorage.removeItem("rag-access-code");
    setAccessCode("");
    setAuthenticated(false);
    setDocumentsOpen(false);
    setMessages([]);
  };

  const askAiStream = async () => {
    const question = input.trim();
    if (!question || loading || !authenticated) return;

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
      await streamAnswer(accessCode, question, controller.signal, (event) => {
        if (event.event === "done") return;
        setMessages((previous) => previous.map((message) => {
          if (message.id !== aiMsgId) return message;
          if (event.event === "sources") return { ...message, sources: event.sources };
          if (event.event === "delta") return { ...message, content: message.content + event.text };
          return { ...message, content: `${message.content}\n\n_${event.message}_` };
        }));
      });
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
            ? { ...message, content: `${message.content}\n\n오류가 발생했습니다: ${getErrorMessage(error)}` }
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
        <div className="header-actions">
          {authenticated && <><button type="button" onClick={() => setDocumentsOpen((open) => !open)}><Files size={16} /> 문서</button><button type="button" onClick={logout} aria-label="잠금"><LogOut size={16} /></button></>}
          <div className="live-status"><span className="live-status__dot" /> {authenticated ? "연결됨" : "PRIVATE DEMO"}</div>
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
              <p>내 문서를 바탕으로 검색하고, 근거를 확인하며 답변을 받으세요.</p>
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
                      {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                        <div className="message__sources"><span>참고한 문서</span>{message.sources.map((source, index) => <details key={`${source.file_id}-${index}`}><summary>[{index + 1}] {source.name}</summary><p>{source.excerpt}</p></details>)}</div>
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
            placeholder={authenticated ? "문서에 대해 질문하세요" : "접근 코드를 먼저 입력하세요"}
            disabled={!authenticated}
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
                disabled={!input.trim() || !authenticated}
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
      {authenticated && <DocumentPanel code={accessCode} open={documentsOpen} onClose={() => setDocumentsOpen(false)} />}
      {!authenticated && <div className="access-overlay"><form className="access-card" onSubmit={(event) => void unlock(event)}><span className="access-card__icon"><LockKeyhole size={22} /></span><span className="eyebrow">PRIVATE PORTFOLIO DEMO</span><h2>RAG LAB에 입장하기</h2><p>개인 문서와 AI 사용량을 보호하기 위해 접근 코드가 필요합니다.</p><label htmlFor="access-code">접근 코드</label><input id="access-code" type="password" autoComplete="off" value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="접근 코드를 입력하세요" /><button type="submit" disabled={authBusy || !codeInput.trim()}>{authBusy ? "확인 중…" : "입장하기"}</button>{authError && <span role="alert" className="panel-error">{authError}</span>}</form></div>}
    </div>
  );
}

export default App;
