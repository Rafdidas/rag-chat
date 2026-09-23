import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("./components/ShaderBackdrop", () => ({
  ShaderBackdrop: () => <div data-testid="shader-backdrop" />,
}));

describe("App", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("requires an access code before chat or documents", () => {
    render(<App />);

    expect(screen.getByText("RAG LAB")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "문서와 대화하세요" })).toBeInTheDocument();
    expect(screen.getByLabelText("접근 코드")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("접근 코드를 먼저 입력하세요")).toBeDisabled();
    expect(screen.getByRole("button", { name: "메시지 전송" })).toBeDisabled();
  });

  it("unlocks the document-backed chat after successful code verification", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("접근 코드"), "demo-code");
    await user.click(screen.getByRole("button", { name: "입장하기" }));
    expect(await screen.findByPlaceholderText("문서에 대해 질문하세요")).toBeEnabled();
    expect(screen.getByRole("button", { name: "문서" })).toBeInTheDocument();
    expect(sessionStorage.getItem("rag-access-code")).toBe("demo-code");
  });
});
