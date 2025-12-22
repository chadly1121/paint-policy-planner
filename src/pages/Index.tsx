import {
  ClipboardList,
  Shield,
  FileText,
  GraduationCap,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import SectionCard from "@/components/manual/SectionCard";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
  {
    title: "Standard Operating Procedures",
    description: "Step-by-step guides for painting tasks and job processes",
    icon: ClipboardList,
    path: "/sops",
    itemCount: 8,
  },
  {
    title: "Safety Protocols",
    description: "Safety guidelines, equipment usage, and hazard prevention",
    icon: Shield,
    path: "/safety",
    itemCount: 6,
  },
  {
    title: "Company Policies",
    description: "Attendance, conduct, dress code, and workplace rules",
    icon: FileText,
    path: "/policies",
    itemCount: 10,
  },
  {
    title: "Training Requirements",
    description: "Required certifications and ongoing education",
    icon: GraduationCap,
    path: "/training",
    itemCount: 5,
  },
  {
    title: "Disciplinary Procedures",
    description: "Progressive discipline and corrective action policies",
    icon: AlertTriangle,
    path: "/disciplinary",
    itemCount: 4,
  },
];

const Index = () => {
  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              Welcome to the Employee Handbook
            </h2>
            <p className="mt-2 text-muted-foreground">
              This manual contains all the essential information you need as a team member.
              Browse through the sections below to find policies, procedures, and guidelines
              for your role. If you have questions, please speak with your supervisor.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">33</p>
          <p className="text-sm text-muted-foreground">Total Policies</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">5</p>
          <p className="text-sm text-muted-foreground">Sections</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">8</p>
          <p className="text-sm text-muted-foreground">SOPs</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">6</p>
          <p className="text-sm text-muted-foreground">Safety Rules</p>
        </div>
      </div>

      {/* Section Cards */}
      <div>
        <h3 className="mb-4 font-serif text-lg font-semibold text-foreground">
          Manual Sections
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <SectionCard key={section.path} {...section} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
