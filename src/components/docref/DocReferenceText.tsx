// Renders a string, replacing doc-ID references (ROP-POL-006, etc.) with clickable links + tooltips.
// Unknown references are left as plain text and logged once per render for admin visibility.
import { Fragment, useEffect } from "react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DOC_REF_REGEX, useDocRegistry } from "@/hooks/useDocRegistry";

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
      parts.push(
        <TooltipProvider key={`ref-${i++}`} delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={entry.route}
                className="font-mono text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
              >
                {match[0]}
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <span className="text-xs">{entry.title}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      // Unknown reference: render with warning styling so broken refs are
      // visible instead of silently passing as plain text.
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
