import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Info, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const disciplinaryKeys = ["disc1", "disc2", "disc3", "disc4"];

const Disciplinary = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const disciplinaryItems = useMemo(() => {
    return disciplinaryKeys.map((key, index) => ({
      id: `disc-${index + 1}`,
      title: t(`disciplinary.${key}.title`),
      content: t(`disciplinary.${key}.content`),
    }));
  }, [t]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return disciplinaryItems;
    
    const query = searchQuery.toLowerCase();
    return disciplinaryItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery, disciplinaryItems]);

  return (
    <div className="space-y-6">
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <Info className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-amber-700">{t("sections.disciplinary.alertTitle")}</AlertTitle>
        <AlertDescription className="text-amber-700/90">
          {t("sections.disciplinary.alertDescription")}
        </AlertDescription>
      </Alert>

      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-serif">{t("sections.disciplinary.title")}</CardTitle>
              <CardDescription>
                {t("sections.disciplinary.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("sections.disciplinary.searchPlaceholder")}
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

      {/* Acknowledgment Note */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Important:</strong> {t("sections.disciplinary.acknowledgment")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Disciplinary;
