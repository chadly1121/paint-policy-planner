// Global side-drawer preview state for cross-document references.
// Setting openDocId opens the drawer; navigating to another doc pushes onto history.
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

interface DocPreviewState {
  openDocId: string | null;
  history: string[]; // stack; current doc is last entry
  openDoc: (docId: string) => void;
  goBack: () => void;
  close: () => void;
}

const Ctx = createContext<DocPreviewState | null>(null);

export function DocPreviewProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<string[]>([]);

  const openDoc = useCallback((docId: string) => {
    const key = docId.toUpperCase();
    setHistory((h) => {
      if (h.length === 0) return [key];
      if (h[h.length - 1] === key) return h;
      return [...h, key];
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }, []);

  const close = useCallback(() => setHistory([]), []);

  const value = useMemo<DocPreviewState>(
    () => ({
      openDocId: history.length > 0 ? history[history.length - 1] : null,
      history,
      openDoc,
      goBack,
      close,
    }),
    [history, openDoc, goBack, close]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocPreview() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDocPreview must be used inside DocPreviewProvider");
  return ctx;
}
