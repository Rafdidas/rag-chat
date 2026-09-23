export type Document = { id: string; name: string; status: string; size: number };
export type Source = { file_id: string; name: string; excerpt: string; score: number };
export type StreamEvent =
  | { event: "sources"; sources: Source[] }
  | { event: "delta"; text: string }
  | { event: "error"; message: string }
  | { event: "done" };

async function check(response: Response): Promise<Response> {
  if (response.ok) return response;
  let detail = "요청을 처리하지 못했습니다.";
  try {
    const body = await response.json();
    if (typeof body.detail === "string") detail = body.detail;
  } catch { /* Keep fallback. */ }
  if (response.status === 401) detail = "접근 코드가 올바르지 않습니다.";
  throw new Error(detail);
}

function headers(code: string): HeadersInit {
  return { "X-App-Access-Code": code };
}

export async function verifyCode(code: string): Promise<void> {
  await check(await fetch("/api/session", { method: "POST", headers: headers(code) }));
}

export async function listDocuments(code: string): Promise<Document[]> {
  const response = await check(await fetch("/api/documents", { headers: headers(code) }));
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(code: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  await check(await fetch("/api/documents", { method: "POST", headers: headers(code), body: form }));
}

export async function deleteDocument(code: string, id: string): Promise<void> {
  await check(await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: "DELETE", headers: headers(code),
  }));
}

export async function streamAnswer(
  code: string,
  question: string,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const response = await check(await fetch("/api/ask/stream", {
    method: "POST",
    headers: { ...headers(code), "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  }));
  if (!response.body) throw new Error("스트림을 읽을 수 없습니다.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const parse = (frame: string) => {
    const event = frame.match(/^event: (.+)$/m)?.[1];
    const data = frame.match(/^data: (.+)$/m)?.[1];
    if (!event || !data) return;
    const body = JSON.parse(data);
    if (event === "sources") onEvent({ event, sources: body.sources });
    if (event === "delta") onEvent({ event, text: body.text });
    if (event === "error") onEvent({ event, message: body.message });
    if (event === "done") onEvent({ event });
  };
  while (true) {
    const { value, done } = await reader.read();
    buffer = (buffer + decoder.decode(value, { stream: !done })).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      parse(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
}
