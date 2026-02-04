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
            <p className="text-foreground/90 mb-2">We collect and process the following types of information:</p>
            
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Account Information</h3>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Name, email address, and organization name</li>
              <li>Role and permissions within your organization</li>
              <li>Profile preferences (language, avatar)</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Training & Compliance Data</h3>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>SOP and policy acknowledgment records with timestamps</li>
              <li>Quiz questions, answers, and completion scores</li>
              <li>Certification details (name, issuer, expiry dates)</li>
              <li>Incident reports submitted through the Platform</li>
              <li>Points earned through training activities</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Technical & Audit Data</h3>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>IP address and user agent (for audit logging)</li>
              <li>Login and usage timestamps</li>
              <li>Google Drive connection status and file metadata (not file content)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Google Drive Integration</h2>
            <p className="text-foreground/90 mb-4">
              SOPed.ai integrates with Google Drive to access your organization's documents:
            </p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li><strong>What we access:</strong> Files in designated SOPed folders that you authorize</li>
              <li><strong>What we store:</strong> File IDs and metadata only—document content stays in Google Drive</li>
              <li><strong>OAuth tokens:</strong> Encrypted and stored securely; used only for API access</li>
              <li><strong>Revocation:</strong> You can disconnect Google Drive anytime from Admin settings</li>
            </ul>
            <p className="text-foreground/90 mt-4">
              We follow the principle of least privilege and only request access to app-created folders 
              and files you explicitly import via Google Picker.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Information</h2>
            <p className="text-foreground/90 mb-2">We use collected information to:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Provide and operate the Platform's training and document management features</li>
              <li>Track acknowledgments, quiz completions, and certification status</li>
              <li>Generate AI-powered quizzes based on your document content</li>
              <li>Send certification expiry reminders and notifications</li>
              <li>Maintain audit logs for compliance verification</li>
              <li>Process subscription payments through Stripe</li>
              <li>Improve Platform functionality and user experience</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">4. AI Processing</h2>
            <p className="text-foreground/90 mb-4">
              We use AI services to generate quiz questions based on your document content:
            </p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Document content is sent to AI providers for quiz generation</li>
              <li>Generated questions are stored and associated with your organization</li>
              <li>AI providers may process data according to their own privacy policies</li>
              <li>Organizations can connect their own OpenAI API key for enhanced control</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Sharing</h2>
            <p className="text-foreground/90 mb-2">We do not sell user data. We share data only:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>With service providers necessary to operate the Platform (hosting, payments, AI)</li>
              <li>With Google to facilitate Drive integration (via authorized APIs)</li>
              <li>With Stripe for subscription and payment processing</li>
              <li>If required by law or valid legal process</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Security</h2>
            <p className="text-foreground/90 mb-2">We implement industry-standard security measures:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>OAuth tokens are encrypted using AES-256-GCM</li>
              <li>Row-level security policies restrict data access by organization</li>
              <li>All data transmission uses TLS encryption</li>
              <li>Audit logs track access and modifications for compliance</li>
            </ul>
            <p className="text-foreground/90 mt-4">
              No system is 100% secure. You are responsible for maintaining your account credentials 
              and Google account security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Retention</h2>
            <p className="text-foreground/90 mb-2">We retain data as follows:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li><strong>Acknowledgments & audit logs:</strong> Retained indefinitely for compliance purposes</li>
              <li><strong>Quiz data:</strong> Retained while your account is active</li>
              <li><strong>Account data:</strong> Retained until account deletion is requested</li>
              <li><strong>Documents:</strong> Remain in your Google Drive (not on our servers)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Organization Data</h2>
            <p className="text-foreground/90">
              Each organization's data is isolated using row-level security. Organization administrators 
              can view acknowledgments, quiz results, and certifications for all members within their 
              organization. Employees can only view their own data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Your Rights</h2>
            <p className="text-foreground/90 mb-2">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal retention requirements)</li>
              <li>Export your data in a portable format</li>
              <li>Revoke Google Drive access at any time</li>
            </ul>
            <p className="text-foreground/90 mt-4">
              Organization administrators can manage team member access. Contact support for data requests.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Compliance Disclaimer</h2>
            <p className="text-foreground/90">
              We provide tools for tracking training and acknowledgments. We do not evaluate, verify, 
              or ensure your legal compliance. Data collected is not used to determine legal obligations. 
              You are responsible for ensuring your use of the Platform meets applicable privacy and 
              data protection laws in your jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Changes to This Policy</h2>
            <p className="text-foreground/90">
              We may update this Privacy Policy periodically. Material changes will be communicated 
              via email or Platform notification. Continued use of the Platform indicates acceptance 
              of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Contact</h2>
            <p className="text-foreground/90">
              For privacy-related questions or data requests, please contact us through the 
              Platform's support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
