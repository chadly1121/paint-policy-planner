// Renders a string, replacing doc-ID references (ROP-POL-006, etc.) with preview-drawer links + tooltips.
// Unknown references are left as plain text with a red squiggle and logged once per render for admin visibility.
import { Fragment, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DOC_REF_REGEX, useDocRegistry } from "@/hooks/useDocRegistry";
import { DocReferenceLink } from "./DocReferenceLink";

interface Props {
  text: string;
}

export function DocReferenceText({ text }: Props) {
  const { data: registry } = useDocRegistry();

  useEffect(() => {
    if (!registry) return;
    const seen = new Set<string>();
    text.replace(DOC_REF_REGEX, (m) => {
      const key = m.toUpperCase();
      if (!registry.has(key) && !seen.has(key)) {
        seen.add(key);
        console.warn(`[DocReference] Broken reference: ${key}`);
      }
      return m;
    });
  }, [text, registry]);

  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(DOC_REF_REGEX.source, "g");
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const key = match[0].toUpperCase();
    const entry = registry?.get(key);
    if (entry) {
      parts.push(<DocReferenceLink key={`ref-${i++}`} entry={entry} label={match[0]} />);
    } else {
      parts.push(
        <TooltipProvider key={`bad-${i++}`} delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="font-mono text-destructive underline decoration-wavy decoration-destructive/70 underline-offset-2 cursor-help"
                aria-label={`Unresolved document reference ${match[0]}`}
              >
                {match[0]}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <span className="text-xs">Unresolved reference — this doc isn't in your library.</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <>
      {parts.map((p, idx) => (
        <Fragment key={idx}>{p}</Fragment>
      ))}
    </>
  );
}
