import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: {lastUpdated}</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p className="text-foreground/90 mb-2">We may collect:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Account information (name, email, company name)</li>
              <li>Login and usage data</li>
              <li>Acknowledgment records (e.g., acceptance of Terms and disclaimers)</li>
              <li>Device and IP information for security and audit purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Information</h2>
            <p className="text-foreground/90 mb-2">We use information to:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Provide and operate the App</li>
              <li>Maintain security and prevent misuse</li>
              <li>Track acknowledgment of Terms and disclaimers</li>
              <li>Improve functionality and user experience</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Legal Compliance Disclaimer</h2>
            <p className="text-foreground/90">
              We do not evaluate, verify, or ensure your legal compliance. Data collected is not used to 
              determine legal obligations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing</h2>
            <p className="text-foreground/90 mb-2">We do not sell user data.</p>
            <p className="text-foreground/90 mb-2">We may share data only:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>With service providers required to operate the App</li>
              <li>If required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Security</h2>
            <p className="text-foreground/90">
              We use reasonable administrative and technical measures to protect data. No system is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">6. User Responsibility</h2>
            <p className="text-foreground/90">
              You are responsible for ensuring your use of the App complies with privacy laws applicable 
              to your jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Retention</h2>
            <p className="text-foreground/90">
              We retain data only as long as necessary for operational, security, and legal purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Your Rights</h2>
            <p className="text-foreground/90">
              You may request access to or deletion of your data, subject to legal and operational requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes</h2>
            <p className="text-foreground/90">
              This Privacy Policy may be updated periodically. Continued use of the App indicates acceptance.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
