import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search } from "lucide-react";

const SOPs = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const sopItems = useMemo(() => [
    { id: "sop-001", title: t("sops.sop001.title"), content: t("sops.sop001.content") },
    { id: "sop-002", title: t("sops.sop002.title"), content: t("sops.sop002.content") },
    { id: "sop-003", title: t("sops.sop003.title"), content: t("sops.sop003.content") },
    { id: "sop-004", title: t("sops.sop004.title"), content: t("sops.sop004.content") },
    { id: "sop-005", title: t("sops.sop005.title"), content: t("sops.sop005.content") },
    { id: "sop-006", title: t("sops.sop006.title"), content: t("sops.sop006.content") },
    { id: "sop-007", title: t("sops.sop007.title"), content: t("sops.sop007.content") },
    { id: "sop-008", title: t("sops.sop008.title"), content: t("sops.sop008.content") },
    { id: "sop-009", title: t("sops.sop009.title"), content: t("sops.sop009.content") },
    { id: "sop-010", title: t("sops.sop010.title"), content: t("sops.sop010.content") },
    { id: "sop-011", title: t("sops.sop011.title"), content: t("sops.sop011.content") },
    { id: "sop-012", title: t("sops.sop012.title"), content: t("sops.sop012.content") },
  ], [t]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sopItems;
    
    const query = searchQuery.toLowerCase();
    return sopItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery, sopItems]);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-serif">{t("sections.sops.title")}</CardTitle>
              <CardDescription>
                {t("sections.sops.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("sections.sops.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {filteredItems.length > 0 ? (
            <PolicySection items={filteredItems} />
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t("common.noResults")} "{searchQuery}"
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SOPs;
