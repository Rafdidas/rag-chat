import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Plus, Trash2, X } from "lucide-react";
import { deleteDocument, listDocuments, uploadDocument, type Document } from "../lib/api";

type Props = { code: string; open: boolean; onClose: () => void };

export function DocumentPanel({ code, open, onClose }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setDocuments(await listDocuments(code));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "문서를 불러올 수 없습니다.");
    }
  }, [code]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 6000);
    return () => window.clearInterval(timer);
  }, [open, refresh]);

  const onUpload = async (file?: File) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("파일은 최대 4MB입니다.");
      return;
    }
    setBusy(true);
    try {
      await uploadDocument(code, file);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "업로드에 실패했습니다.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDelete = async (document: Document) => {
    if (!window.confirm(`“${document.name}” 문서를 삭제할까요?`)) return;
    setBusy(true);
    try {
      await deleteDocument(code, document.id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <aside className="document-panel" aria-label="문서 관리">
      <div className="document-panel__heading">
        <div><span className="eyebrow">KNOWLEDGE BASE</span><h2>내 문서</h2></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="문서 패널 닫기"><X size={18} /></button>
      </div>
      <p className="document-panel__intro">PDF, TXT, MD 문서를 업로드하면 질문의 근거로 사용합니다.</p>
      <input ref={inputRef} type="file" accept=".pdf,.txt,.md" hidden aria-label="업로드할 문서 선택" onChange={(event) => void onUpload(event.target.files?.[0])} />
      <button type="button" className="upload-button" disabled={busy} onClick={() => inputRef.current?.click()}><Plus size={16} /> 문서 업로드 <span>최대 4MB</span></button>
      {error && <p className="panel-error" role="alert">{error}</p>}
      <div className="document-panel__list">
        {documents.length === 0 ? <p className="document-panel__empty">아직 업로드한 문서가 없습니다.</p> : documents.map((document) => (
          <div className="document-item" key={document.id}>
            <span className="document-item__icon"><FileText size={17} /></span>
            <div className="document-item__info"><strong title={document.name}>{document.name}</strong><small>{document.status === "completed" ? "검색 가능" : document.status === "failed" ? "처리 실패" : "처리 중"} · {(document.size / 1024).toFixed(1)} KB</small></div>
            <button type="button" className="icon-button" disabled={busy} aria-label={`${document.name} 삭제`} onClick={() => void onDelete(document)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </aside>
  );
}
