import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Search } from "lucide-react";

const policyKeys = ["policy1", "policy2", "policy3", "policy4", "policy5", "policy6", "policy7", "policy8", "policy9", "policy10"];

const Policies = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const policyItems = useMemo(() => {
    return policyKeys.map((key, index) => ({
      id: `policy-${index + 1}`,
      title: t(`policies.${key}.title`),
      content: t(`policies.${key}.content`),
    }));
  }, [t]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return policyItems;
    
    const query = searchQuery.toLowerCase();
    return policyItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery, policyItems]);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-serif">{t("sections.policies.title")}</CardTitle>
              <CardDescription>
                {t("sections.policies.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("sections.policies.searchPlaceholder")}
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

export default Policies;
