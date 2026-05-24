// Inline doc-reference link. Plain click opens the preview drawer.
// Ctrl/Cmd/middle-click falls through to native anchor for new-tab behavior.
import { MouseEvent } from "react";
import { useDocPreview } from "@/contexts/DocPreviewContext";
import type { DocRegistryEntry } from "@/hooks/useDocRegistry";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const HINT_KEY = "docref_preview_hint_seen";

interface Props {
  entry: DocRegistryEntry;
  label: string;
}

export function DocReferenceLink({ entry, label }: Props) {
  const { openDoc } = useDocPreview();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Honor modifier keys / middle click: let the browser open a new tab.
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    openDoc(entry.doc_id_external);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const hintSeen = (() => {
    try {
      return localStorage.getItem(HINT_KEY) === "1";
    } catch {
      return true;
    }
  })();

  const tooltipText = hintSeen
    ? entry.title
    : `Click to preview — full document opens with quiz & ack. (${entry.title})`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={entry.route}
            onClick={handleClick}
            onAuxClick={(e) => {
              // middle click (button 1) — leave native behavior
              if (e.button !== 1) {
                e.preventDefault();
                openDoc(entry.doc_id_external);
              }
            }}
            className="font-mono text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid cursor-pointer"
          >
            {label}
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <span className="text-xs">{tooltipText}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
