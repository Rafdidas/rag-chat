import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("./components/ShaderBackdrop", () => ({
  ShaderBackdrop: () => <div data-testid="shader-backdrop" />,
}));

describe("App", () => {
  it("renders the dark lab chat shell with an accessible composer", () => {
    render(<App />);

    expect(screen.getByText("RAG LAB")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "문서와 대화하세요" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("질문을 입력하세요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "메시지 전송" })).toBeDisabled();
  });
});
