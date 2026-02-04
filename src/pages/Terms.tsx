import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
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
              By creating an account or using SOPed.ai ("the Platform"), you agree to these Terms of Service. 
              If you do not agree, you may not use the Platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p className="text-foreground/90 mb-4">
              SOPed.ai is a training and document management platform that integrates with Google Drive 
              to help organizations manage SOPs, policies, training materials, certifications, and 
              employee acknowledgments.
            </p>
            <p className="text-foreground/90 mb-2">The Platform provides:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Google Drive integration for document storage and retrieval</li>
              <li>AI-generated quizzes based on your document content</li>
              <li>Acknowledgment and progress tracking for employees</li>
              <li>Certification management with expiry reminders</li>
              <li>Incident reporting and Safety Data Sheet management</li>
              <li>Team management and role-based access controls</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">3. No Legal or Professional Advice</h2>
            <p className="text-foreground/90 mb-4">
              The Platform provides tools for document management and training tracking. It does NOT:
            </p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Provide legal, employment, HR, or safety advice</li>
              <li>Guarantee compliance with any laws or regulations</li>
              <li>Verify the accuracy or legal sufficiency of your documents</li>
              <li>Substitute for qualified professional consultation</li>
            </ul>
            <p className="text-foreground/90 mt-4">
              AI-generated quizzes are based on your document content and should be reviewed for accuracy 
              before use. The Platform is not responsible for quiz content quality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">4. User Responsibilities</h2>
            <p className="text-foreground/90 mb-2">You are solely responsible for:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Creating accurate, legally compliant documents</li>
              <li>Reviewing AI-generated quiz questions for correctness</li>
              <li>Ensuring your training programs meet applicable regulations</li>
              <li>Maintaining your Google Drive connection and document organization</li>
              <li>Managing employee access and permissions within your organization</li>
              <li>Backing up your data and documents appropriately</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Google Drive Integration</h2>
            <p className="text-foreground/90 mb-4">
              The Platform integrates with Google Drive to store and retrieve your documents. By connecting 
              your Google account:
            </p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>You authorize the Platform to read and create files in designated folders</li>
              <li>Document content remains in your Google Drive—we do not store document content</li>
              <li>You can revoke access at any time from your Admin settings or Google account</li>
              <li>You are responsible for your Google account security and access controls</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Data We Collect and Store</h2>
            <p className="text-foreground/90 mb-2">We store the following data on our servers:</p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>User account information (name, email, organization)</li>
              <li>Document metadata (file IDs, titles—not content)</li>
              <li>Acknowledgment records with timestamps</li>
              <li>Quiz questions, answers, and completion results</li>
              <li>Certification records and expiry dates</li>
              <li>Incident reports submitted through the Platform</li>
              <li>Audit logs of user actions for compliance tracking</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Subscription and Billing</h2>
            <p className="text-foreground/90 mb-4">
              Access to the Platform requires an active subscription. Subscription details, including 
              pricing, seat limits, and billing cycles, are displayed during checkout and in your 
              Admin settings. Subscriptions are managed through Stripe.
            </p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Subscriptions renew automatically unless cancelled</li>
              <li>Additional seats can be purchased as add-ons</li>
              <li>Cancellation takes effect at the end of the billing period</li>
              <li>No refunds are provided for partial billing periods</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Account Security</h2>
            <p className="text-foreground/90">
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities that occur under your account. Organization administrators 
              are responsible for managing employee access and ensuring compliance with these Terms 
              within their organization.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Disclaimer of Warranties</h2>
            <p className="text-foreground/90">
              The Platform is provided "as is" and "as available," without warranties of any kind, 
              express or implied. We do not warrant that the Platform will be uninterrupted, 
              error-free, or suitable for any particular purpose. AI-generated content may contain 
              errors and should be reviewed before use.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Limitation of Liability</h2>
            <p className="text-foreground/90 mb-2">
              To the maximum extent permitted by law, SOPed.ai and its operators are not liable for:
            </p>
            <ul className="list-disc list-inside text-foreground/90 space-y-1">
              <li>Legal or regulatory non-compliance resulting from Platform use</li>
              <li>Errors in AI-generated quiz questions or content</li>
              <li>Loss of data due to Google Drive issues or account access problems</li>
              <li>Business decisions made based on Platform data</li>
              <li>Indirect, incidental, or consequential damages of any kind</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Modifications to Terms</h2>
            <p className="text-foreground/90">
              We may update these Terms at any time. Material changes will be communicated via 
              email or Platform notification. Continued use of the Platform after changes 
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Termination</h2>
            <p className="text-foreground/90">
              We reserve the right to suspend or terminate accounts that violate these Terms or 
              engage in fraudulent, abusive, or harmful behavior. Upon termination, your access 
              to the Platform will cease, but your documents remain in your Google Drive.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">13. Governing Law</h2>
            <p className="text-foreground/90">
              These Terms are governed by the laws of the jurisdiction in which SOPed.ai is 
              registered, without regard to conflict-of-law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">14. Contact</h2>
            <p className="text-foreground/90">
              For questions about these Terms, please contact us through the Platform's support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
