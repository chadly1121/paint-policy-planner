import { useState, useMemo } from "react";
import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, AlertCircle, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const safetyItems = [
  {
    id: "safety-1",
    title: "1. Personal Protective Equipment (PPE)",
    content: `All employees must wear appropriate PPE:
• Safety glasses when sanding, scraping, or spraying
• Dust masks (N95 minimum) when sanding or working with dusty materials
• Respirators when spraying or working with solvent-based products
• Work gloves when handling rough materials or chemicals
• Non-slip footwear at all times on job sites
• Hard hats when required by job site conditions
• Hearing protection when using power equipment
Failure to wear required PPE will result in immediate removal from job site.`,
  },
  {
    id: "safety-2",
    title: "2. Ladder Safety",
    content: `Follow these ladder safety rules without exception:
• Inspect ladder before each use - check for damage, loose parts
• Set ladder on firm, level ground only
• Maintain three points of contact at all times
• Never stand on top two rungs of a stepladder
• Extension ladders must extend 3 feet above landing point
• Never lean a ladder against a window or unsecured surface
• Do not exceed weight capacity (painter + materials)
• Never move a ladder while someone is on it
• Use ladder stabilizers for extension ladders when available`,
  },
  {
    id: "safety-3",
    title: "3. Chemical Safety & HAZCOM",
    content: `Handle all chemicals with care:
• Read all product labels and Safety Data Sheets before use
• Never mix chemicals unless specifically instructed
• Use products only in well-ventilated areas
• Keep containers closed when not actively pouring
• Store chemicals away from heat sources and ignition
• Dispose of rags and waste properly - spontaneous combustion risk
• Know the location of eyewash stations and first aid kits
• Report any chemical spills immediately to supervisor
• Never eat, drink, or smoke while handling chemicals`,
  },
  {
    id: "safety-4",
    title: "4. Lead Paint Safety (Pre-1978 Buildings)",
    content: `When working on buildings constructed before 1978:
• Assume all paint contains lead until tested
• Only RRP-certified workers may disturb lead paint
• Contain work area with plastic sheeting
• Use HEPA vacuum and wet methods to minimize dust
• Wear appropriate respirator (P100 minimum)
• Do not eat, drink, or smoke in work areas
• Wash hands and face before breaks and meals
• Change clothes before going home
• Dispose of waste according to EPA regulations`,
  },
  {
    id: "safety-5",
    title: "5. Scaffolding Safety",
    content: `When using scaffolding:
• Only competent persons may erect, modify, or dismantle scaffolding
• Inspect scaffolding before each shift
• Ensure all locks and braces are secure
• Planking must extend at least 6 inches past supports
• Guardrails required when working 10 feet or higher
• Never climb on cross braces
• Keep platforms clear of debris and spills
• Lock casters before mounting mobile scaffolds
• Do not exceed load capacity`,
  },
  {
    id: "safety-6",
    title: "6. Emergency Procedures",
    content: `In case of emergency:
• Know the location of all exits, fire extinguishers, and first aid kits
• Call 911 for life-threatening emergencies
• Report all injuries to supervisor immediately, no matter how minor
• For chemical exposure: flush with water for 15+ minutes, seek medical attention
• For falls: do not move injured person unless in immediate danger
• For fire: alert others, evacuate, call 911, use extinguisher only if safe
• Document all incidents on company incident report form
• First aid kits must be restocked after any use`,
  },
];

const Safety = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return safetyItems;
    
    const query = searchQuery.toLowerCase();
    return safetyItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <Alert className="border-destructive/50 bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <AlertTitle className="text-destructive">Safety First</AlertTitle>
        <AlertDescription className="text-destructive/90">
          All employees are expected to follow these safety protocols at all times.
          Violations may result in disciplinary action up to and including termination.
        </AlertDescription>
      </Alert>

      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-serif">Safety Protocols</CardTitle>
              <CardDescription>
                Guidelines to keep you and your coworkers safe on every job
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search safety protocols by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {filteredItems.length > 0 ? (
            <PolicySection items={filteredItems} />
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No safety protocols found matching "{searchQuery}"
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Safety;
