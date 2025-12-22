import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, CheckCircle2 } from "lucide-react";

const trainingItems = [
  {
    id: "training-1",
    title: "1. New Employee Orientation",
    content: `All new employees must complete:
• Company policies and procedures review (this manual)
• Safety orientation and PPE training
• Equipment and tool familiarization
• Customer service expectations
• Shadowing experienced painter for minimum 2 shifts
• Orientation quiz with minimum 80% score required
• Sign acknowledgment of receipt for employee handbook
Orientation must be completed within first 5 working days.`,
  },
  {
    id: "training-2",
    title: "2. Required Certifications",
    content: `The following certifications are required:
EPA RRP (Renovation, Repair & Painting) Certification:
• Required for all painters within 90 days of hire
• Renewal required every 5 years
• Company will pay for initial certification
OSHA 10-Hour Construction Safety:
• Required for all employees within 6 months of hire
• Recommended OSHA 30-Hour for leads and supervisors
CPR/First Aid (for supervisors):
• Crew leads must maintain current certification
• Renewal every 2 years`,
  },
  {
    id: "training-3",
    title: "3. Ongoing Training Requirements",
    content: `Continuous improvement is expected:
• Monthly safety toolbox talks (mandatory attendance)
• Quarterly skills workshops
• Annual safety refresher training
• Product training when new materials are introduced
• Customer service training annually
• Training hours count toward regular pay
• Employees may request additional training opportunities
Document all training in employee file.`,
  },
  {
    id: "training-4",
    title: "4. Skill Development Levels",
    content: `Career progression path:
Apprentice Painter (0-6 months):
• Basic prep work and cleanup
• Learning proper painting techniques
• Shadowing experienced painters
Painter (6 months - 2 years):
• Independent work on standard projects
• Customer interaction
• Quality control awareness
Senior Painter (2-5 years):
• Complex projects and specialty finishes
• Mentoring apprentices
• Estimating assistance
Crew Lead (5+ years):
• Team management
• Customer relations
• Quality assurance`,
  },
  {
    id: "training-5",
    title: "5. Training Documentation",
    content: `Keep accurate training records:
• All training must be documented with date and trainer signature
• Certification copies maintained in employee file
• Training log reviewed during performance evaluations
• Employees responsible for tracking certification renewals
• Expired certifications may result in temporary reassignment
• Training records available for employee review upon request
Submit training completion forms to supervisor within 48 hours.`,
  },
];

const requiredCertifications = [
  { name: "EPA RRP Certification", timeline: "Within 90 days" },
  { name: "OSHA 10-Hour Construction", timeline: "Within 6 months" },
  { name: "Company Safety Orientation", timeline: "First week" },
  { name: "Customer Service Training", timeline: "Within 30 days" },
];

const Training = () => {
  return (
    <div className="space-y-6">
      {/* Quick Reference Card */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Required Certifications Checklist
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
              <CardTitle className="font-serif">Training Requirements</CardTitle>
              <CardDescription>
                Required certifications and ongoing education for team members
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PolicySection items={trainingItems} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Training;
