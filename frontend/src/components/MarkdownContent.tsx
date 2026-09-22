import { Children, isValidElement, type ReactNode, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
};

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textFromNode).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textFromNode(node.props.children);
  }

  return "";
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeElement = Children.toArray(children).find(isValidElement);
  const className = isValidElement<{ className?: string }>(codeElement)
    ? codeElement.props.className ?? ""
    : "";
  const language = /language-([\w-]+)/.exec(className)?.[1] ?? "code";
  const code = textFromNode(codeElement).replace(/\n$/, "");

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="code-block">
      <div className="code-block__toolbar">
        <span>{language}</span>
        <button type="button" aria-label="코드 복사" onClick={copyCode}>
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{ pre: CodeBlock }}
    >
      {content}
    </ReactMarkdown>
  );
}
