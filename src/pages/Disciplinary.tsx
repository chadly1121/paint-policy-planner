import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Info, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const disciplinaryItems = [
  {
    id: "disc-1",
    title: "1. Progressive Discipline Policy",
    content: `We follow a progressive discipline approach:
Step 1 - Verbal Warning:
• Documented conversation with supervisor
• Clear explanation of issue and expectations
• Employee acknowledgment
Step 2 - Written Warning:
• Formal written documentation
• Specific improvement requirements
• Timeline for improvement
• Employee signature required
Step 3 - Final Written Warning:
• Last chance notice
• Suspension may be included
• Clear statement that next violation leads to termination
Step 4 - Termination:
• Employment ends
• Final paycheck issued per state law
Note: Severity of offense may warrant skipping steps.`,
  },
  {
    id: "disc-2",
    title: "2. Immediate Termination Offenses",
    content: `The following will result in immediate termination:
• Theft or dishonesty
• Violence or threats of violence
• Possession of weapons on job sites
• Possession or use of drugs/alcohol at work
• Gross negligence resulting in injury or significant property damage
• Sexual harassment or assault
• Abandonment of job (3 consecutive no-call/no-show days)
• Falsification of time records or company documents
• Insubordination (refusal to follow reasonable work instructions)
• Serious safety violations that endanger others`,
  },
  {
    id: "disc-3",
    title: "3. Documentation Requirements",
    content: `All disciplinary actions must be documented:
• Date, time, and location of incident
• Description of the violation
• Previous related warnings (if applicable)
• Corrective action or expectations
• Timeline for improvement
• Consequences of continued violations
• Signatures of supervisor and employee
• Employee may add written comments
• Copy provided to employee; original in personnel file
All documentation is confidential.`,
  },
  {
    id: "disc-4",
    title: "4. Appeal Process",
    content: `Employees may appeal disciplinary actions:
• Appeals must be submitted in writing within 5 business days
• Address appeal to company owner/HR manager
• Include specific reasons why action was unfair
• Relevant documentation may be attached
• Decision will be made within 10 business days
• Appeal decision is final
• Employee may continue working during appeal process (unless suspended)
• No retaliation for filing an appeal`,
  },
];

const Disciplinary = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return disciplinaryItems;
    
    const query = searchQuery.toLowerCase();
    return disciplinaryItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
