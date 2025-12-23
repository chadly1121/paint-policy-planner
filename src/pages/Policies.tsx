import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Search } from "lucide-react";

const policyItems = [
  {
    id: "policy-1",
    title: "1. Attendance & Punctuality",
    content: `Reliable attendance is essential:
• Report to designated meeting location or job site at scheduled time
• Notify supervisor at least 2 hours before shift if you will be late or absent
• Excessive tardiness (3+ incidents per month) will result in disciplinary action
• No-call/no-show will result in immediate disciplinary action
• Scheduled time off requests must be submitted at least 2 weeks in advance
• Unexcused absences may result in loss of hours or termination`,
  },
  {
    id: "policy-2",
    title: "2. Dress Code & Appearance",
    content: `Present a professional image:
• Wear company-provided uniform shirt or approved work clothing
• Pants must be work-appropriate (no shorts shorter than knee-length)
• Closed-toe, non-slip work boots required at all times
• No offensive graphics, logos, or language on clothing
• Long hair must be tied back for safety
• Remove or cover jewelry that could catch on equipment
• Maintain good personal hygiene
• Uniforms must be clean and in good condition`,
  },
  {
    id: "policy-3",
    title: "3. Vehicle & Driving Policy",
    content: `When driving company vehicles or on company business:
• Valid driver's license required; must remain on file
• Report any changes to license status immediately
• Follow all traffic laws - tickets are employee's responsibility
• No cell phone use while driving (including hands-free)
• No passengers other than employees without supervisor approval
• Report any accidents or damage immediately
• Keep vehicles clean and fueled
• Complete daily vehicle inspection checklist`,
  },
  {
    id: "policy-4",
    title: "4. Drug & Alcohol Policy",
    content: `Zero tolerance policy:
• Employees must be free from impairment during work hours
• No alcohol or illegal drugs on job sites or in company vehicles
• Prescription medications that cause impairment must be reported to supervisor
• Random drug testing may be conducted
• Post-accident drug testing is mandatory
• Positive test result will result in immediate termination
• Employees must report any drug-related arrests or convictions`,
  },
  {
    id: "policy-5",
    title: "5. Cell Phone & Personal Device Use",
    content: `Minimize distractions:
• Personal calls and texts should be limited to break times only
• Phones must be on silent/vibrate during work hours
• Taking photos or videos on job sites requires customer permission
• Company-related communication (scheduling, updates) is permitted
• Never use phone while on ladder or operating equipment
• Earbuds/headphones not permitted during work activities
• Use of phones during work may result in disciplinary action`,
  },
  {
    id: "policy-6",
    title: "6. Customer Relations",
    content: `Maintain professional relationships:
• Greet customers politely and introduce yourself
• Address customer concerns promptly and professionally
• Never argue with customers - escalate issues to supervisor
• Respect customer property and privacy
• Do not discuss company business or other customers
• Accept tips graciously if offered, but never solicit
• Report any customer complaints to supervisor immediately
• Leave every job site cleaner than you found it`,
  },
  {
    id: "policy-7",
    title: "7. Confidentiality",
    content: `Protect sensitive information:
• Customer information is confidential - do not share externally
• Do not discuss pricing, estimates, or job details with competitors
• Company financial information is strictly confidential
• Social media posts about work require management approval
• Do not photograph customer property without permission
• Proprietary techniques and formulas are trade secrets
• Confidentiality obligations continue after employment ends`,
  },
  {
    id: "policy-8",
    title: "8. Anti-Harassment & Discrimination",
    content: `We maintain a respectful workplace:
• Harassment of any kind will not be tolerated
• Discrimination based on protected characteristics is prohibited
• Report any concerns to supervisor or HR immediately
• Retaliation against those who report concerns is prohibited
• All complaints will be investigated promptly
• Substantiated harassment will result in termination
• We are committed to equal opportunity employment`,
  },
  {
    id: "policy-9",
    title: "9. Tool & Equipment Policy",
    content: `Care for company equipment:
• Employees are responsible for tools assigned to them
• Report lost, stolen, or damaged tools immediately
• Personal tools may be used with supervisor approval
• Do not loan company tools to non-employees
• Return all company property upon separation
• Cost of negligently damaged/lost tools may be deducted from pay
• Use tools only for their intended purpose`,
  },
  {
    id: "policy-10",
    title: "10. Break & Meal Periods",
    content: `Breaks are provided as follows:
• 15-minute paid break for shifts of 4+ hours
• 30-minute unpaid meal break for shifts of 6+ hours
• Second 15-minute paid break for shifts of 8+ hours
• Breaks must be taken at appropriate times (not during critical tasks)
• Do not leave job site during breaks without supervisor approval
• Clean up eating areas after meals
• Smoking only in designated areas, away from work zones`,
  },
];

const Policies = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return policyItems;
    
    const query = searchQuery.toLowerCase();
    return policyItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
