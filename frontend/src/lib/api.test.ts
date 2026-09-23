import { afterEach, describe, expect, it, vi } from "vitest";
import { streamAnswer, type StreamEvent } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("streamAnswer", () => {
  it("parses SSE events split across network and UTF-8 boundaries", async () => {
    const payload = 'event: sources\r\ndata: {"sources":[{"file_id":"f1","name":"노트.txt","excerpt":"근거","score":0.9}]}\r\n\r\nevent: delta\ndata: {"text":"안녕"}\n\nevent: done\ndata: {}\n\n';
    const bytes = new TextEncoder().encode(payload);
    const chunks = [bytes.slice(0, 15), bytes.slice(15, 65), bytes.slice(65, 93), bytes.slice(93)];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body }));
    const events: StreamEvent[] = [];
    await streamAnswer("secret", "question", new AbortController().signal, (event) => events.push(event));
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ event: "sources", sources: [{ name: "노트.txt" }] });
    expect(events[1]).toEqual({ event: "delta", text: "안녕" });
    expect(events[2]).toEqual({ event: "done" });
  });
});
