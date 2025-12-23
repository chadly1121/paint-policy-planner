import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GraduationCap, CheckCircle2, Search } from "lucide-react";

const trainingKeys = ["training1", "training2", "training3", "training4", "training5"];

const Training = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const trainingItems = useMemo(() => {
    return trainingKeys.map((key, index) => ({
      id: `training-${index + 1}`,
      title: t(`training.${key}.title`),
      content: t(`training.${key}.content`),
    }));
  }, [t]);

  const requiredCertifications = [
    { name: t("certifications.epaRrp"), timeline: t("certifications.within90Days") },
    { name: t("certifications.osha10"), timeline: t("certifications.within6Months") },
    { name: t("certifications.safetyOrientation"), timeline: t("certifications.firstWeek") },
    { name: t("certifications.customerService"), timeline: t("certifications.within30Days") },
  ];

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return trainingItems;
    
    const query = searchQuery.toLowerCase();
    return trainingItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery, trainingItems]);

  return (
    <div className="space-y-6">
      {/* Quick Reference Card */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t("sections.training.checklistTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {requiredCertifications.map((cert) => (
              <li key={cert.name} className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="font-medium text-foreground">{cert.name}</span>
                <span className="text-muted-foreground">— {cert.timeline}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-serif">{t("sections.training.title")}</CardTitle>
              <CardDescription>
                {t("sections.training.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("sections.training.searchPlaceholder")}
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

export default Training;
