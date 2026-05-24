// Global side-drawer that previews documents referenced inline (ROP-XXX-###).
// Mounted once at the app root; opens whenever DocPreviewContext has an openDocId.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Loader2, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDocPreview } from "@/contexts/DocPreviewContext";
import { useDocRegistry, DocCategory } from "@/hooks/useDocRegistry";
import { useDriveContent } from "@/hooks/useDriveContent";
import { useDriveParsedSections } from "@/hooks/useDriveParsedSections";
import { NonNegotiablesCallout } from "@/components/drive/NonNegotiablesCallout";
import { DocReferenceText } from "./DocReferenceText";
import { extractRelationships } from "@/lib/documentRelationships";

const CATEGORY_LABEL: Record<DocCategory, string> = {
  POL: "Policy",
  SOP: "SOP",
  FRM: "Form",
  SAF: "Safety",
  TRN: "Training",
  DSC: "Disciplinary",
};

function PreviewBody({ docId }: { docId: string }) {
  const { t } = useTranslation();
  const { data: registry } = useDocRegistry();
  const entry = registry?.get(docId.toUpperCase());
  const { fetchDriveContent, currentLanguage } = useDriveContent();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: parsedSections } = useDriveParsedSections(
    entry?.drive_file_id ?? null,
    entry?.moduleType ?? "policies",
    entry?.doc_id_external ?? null,
  );

  const nonNegotiables = Array.isArray(parsedSections?.non_negotiables)
    ? parsedSections!.non_negotiables!.filter((s) => typeof s === "string" && s.trim().length > 0)
    : [];

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    if (!entry?.drive_file_id) return;
    setLoading(true);
    fetchDriveContent(entry.drive_file_id, { translate: true })
      .then((c) => {
        if (!cancelled) setContent(c);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [entry?.drive_file_id, currentLanguage, fetchDriveContent]);

  if (!entry) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Reference not found in your library.
      </div>
    );
  }

  if (!entry.drive_file_id) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        This document is not linked to a Drive file yet.
      </div>
    );
  }

  if (loading || !content) {
    return (
      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <Languages className="h-4 w-4" />
          <span>{currentLanguage !== "en" ? t("common.translating") : t("common.loading")}…</span>
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  // Strip "Related Procedures" / "Non-Negotiables" sections; render rest as simple markdown.
  const { bodyLines } = extractRelationships(content);
  const filtered: string[] = [];
  let skip = false;
  const stripNN = nonNegotiables.length > 0;
  for (const line of bodyLines) {
    const h2 = line.match(/^\s*##\s+(.+?)\s*$/);
    if (h2) {
      const heading = h2[1].replace(/[:*_]/g, "").trim().toLowerCase();
      if (stripNN && (heading === "non-negotiables" || heading === "non negotiables")) {
        skip = true;
        continue;
      }
      skip = false;
      filtered.push(line);
      continue;
    }
    if (skip) continue;
    filtered.push(line);
  }

  return (
    <div className="px-6 pb-8">
      {nonNegotiables.length > 0 && <NonNegotiablesCallout items={nonNegotiables} />}
      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
        {filtered.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <br key={idx} />;
          if (trimmed.startsWith("## "))
            return (
              <h3 key={idx} className="font-semibold mt-4 mb-2 text-primary">
                <DocReferenceText text={trimmed.substring(3)} />
              </h3>
            );
          if (trimmed.startsWith("# "))
            return (
              <h2 key={idx} className="font-bold mt-4 mb-2 text-primary text-lg">
                <DocReferenceText text={trimmed.substring(2)} />
              </h2>
            );
          if (trimmed.startsWith("- ") || trimmed.startsWith("• "))
            return (
              <li key={idx} className="ml-4 flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span><DocReferenceText text={trimmed.substring(2)} /></span>
              </li>
            );
          return (
            <p key={idx} className="mb-1">
              <DocReferenceText text={trimmed} />
            </p>
          );
        })}
      </div>
    </div>
  );
}

export function DocPreviewDrawer() {
  const { openDocId, history, goBack, close } = useDocPreview();
  const { data: registry } = useDocRegistry();
  const navigate = useNavigate();
  const open = !!openDocId;
  const entry = openDocId ? registry?.get(openDocId.toUpperCase()) : undefined;

  const handleViewFull = () => {
    if (!entry) return;
    navigate(entry.route);
    close();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-none md:w-[45vw] md:min-w-[500px] flex flex-col gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            {history.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="h-8 w-8 p-0"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {entry && (
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABEL[entry.category]}
              </Badge>
            )}
            <span className="font-mono text-xs text-muted-foreground">
              {openDocId}
            </span>
          </div>
          <SheetTitle className="text-xl leading-tight pr-8">
            {entry?.title ?? "Loading…"}
          </SheetTitle>
          {entry && (
            <div>
              <Button size="sm" variant="default" onClick={handleViewFull}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Full Document
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {openDocId && <PreviewBody key={openDocId} docId={openDocId} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
