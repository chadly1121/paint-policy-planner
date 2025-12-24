import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
  const { t } = useTranslation();
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/auth">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last Updated: {lastUpdated}</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-foreground/90">
              By creating an account or using this application ("the App"), you agree to these Terms of Service. 
              If you do not agree, you may not use the App.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Nature of the Service</h2>
            <p className="text-foreground/90 mb-4">
              The App provides operational tools, templates, checklists, workflows, and general best-practice 
              guidance for painting and contracting businesses.
            </p>
            <p className="text-foreground/90 mb-2">The App:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Does NOT provide legal advice</li>
              <li>Does NOT provide employment, safety, or regulatory advice</li>
              <li>Does NOT guarantee compliance with any law or regulation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">3. No Legal or Professional Advice</h2>
            <p className="text-foreground/90 mb-4">
              Content provided in the App is for general informational and operational guidance only. 
              It is not a substitute for advice from qualified professionals, including lawyers, accountants, 
              HR professionals, or safety consultants.
            </p>
            <p className="text-foreground/90 mb-2">You are solely responsible for:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Determining which laws apply to your business</li>
              <li>Ensuring compliance with all applicable laws and regulations</li>
              <li>Seeking professional advice where required</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">4. User Responsibility</h2>
            <p className="text-foreground/90 mb-4">
              You acknowledge that laws vary by jurisdiction and change over time. 
              Use of the App does not ensure legal compliance.
            </p>
            <p className="text-foreground/90">
              You assume all risk arising from your use of the App.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Disclaimer of Warranties</h2>
            <p className="text-foreground/90">
              The App is provided "as is" and "as available," without warranties of any kind, express or implied, 
              including but not limited to fitness for a particular purpose or compliance with laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Limitation of Liability</h2>
            <p className="text-foreground/90 mb-2">
              To the maximum extent permitted by law, the App, its owners, and operators are not liable for 
              any damages arising from:
            </p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Use of or reliance on the App</li>
              <li>Legal or regulatory non-compliance</li>
              <li>Business decisions made using the App</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Account Use</h2>
            <p className="text-foreground/90">
              You are responsible for maintaining the confidentiality of your account and ensuring that 
              your employees comply with these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Modifications</h2>
            <p className="text-foreground/90">
              We may update these Terms at any time. Continued use of the App constitutes acceptance of updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Governing Law</h2>
            <p className="text-foreground/90">
              These Terms are governed by the laws of the jurisdiction in which the company is registered, 
              without regard to conflict-of-law principles.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
