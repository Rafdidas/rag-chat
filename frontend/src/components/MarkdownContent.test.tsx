import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent", () => {
  it("copies the original highlighted code instead of React node strings", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <MarkdownContent
        content={"```ts\nconst answer: number = 42;\n```"}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "코드 복사" }));

    expect(writeText).toHaveBeenCalledWith("const answer: number = 42;");
  });

  it("renders inline code without a block toolbar", () => {
    render(<MarkdownContent content={"Use `npm run dev` to start."} />);

    expect(screen.getByText("npm run dev").tagName).toBe("CODE");
    expect(screen.queryByRole("button", { name: "코드 복사" })).not.toBeInTheDocument();
  });
});
