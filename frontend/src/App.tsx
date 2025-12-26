import { useState } from "react";
import './App.css';

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const askAi = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      setAnswer(data.answer);
    } catch (e) {
      setAnswer("에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h1 style={{ fontSize: "25px", marginBottom: "10px" }}>AI 질문 테스트</h1>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="질문을 입력하세요"
        style={{ width: "100%", padding: 8 }}
      />

      <button onClick={askAi} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "질문 중..." : "질문하기"}
      </button>

      {answer && (
        <div style={{ marginTop: 20 }}>
          <h3>답변</h3>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default App;