import { useState } from "react";
import { ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  items: string[];
}

/**
 * Bright-line "Non-Negotiables" callout shown above doc body. Amber styling matches
 * the Safety First pattern. Collapsible on mobile (defaults closed <md, open ≥md).
 */
export function NonNegotiablesCallout({ items }: Props) {
  // Default open on desktop, closed on mobile. matchMedia is SSR-safe-guarded.
  const initialOpen =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(min-width: 768px)").matches
      : true;
  const [open, setOpen] = useState(initialOpen);

  if (!items?.length) return null;

  return (
    <div className="mb-4 rounded-lg border-2 border-amber-500/60 bg-amber-50 dark:bg-amber-950/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 p-3 text-left">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm uppercase tracking-wide">
              Non-Negotiables
            </h3>
            <span className="text-xs text-amber-700 dark:text-amber-300/80 md:hidden">
              ({items.length})
            </span>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-amber-700 dark:text-amber-300 md:hidden" />
          ) : (
            <ChevronDown className="h-4 w-4 text-amber-700 dark:text-amber-300 md:hidden" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="px-4 pb-3 pt-0 space-y-1.5">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100"
              >
                <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
