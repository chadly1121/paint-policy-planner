import { Check, Users, FileText, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const Pricing = () => {
  const features = [
    { icon: FileText, text: "22+ Standard Operating Procedures" },
    { icon: Shield, text: "Safety & Compliance Guidelines" },
    { icon: Users, text: "Up to 6 team members included" },
    { icon: Zap, text: "AI-Powered SOP Assistant" },
  ];

  const allFeatures = [
    "Standard Operating Procedures Library",
    "Safety Guidelines & Training",
    "Company Policies Management",
    "Training Materials & Quizzes",
    "Disciplinary Procedures",
    "Employee Progress Tracking",
    "Points & Rewards System",
    "Certificate Generation",
    "Google Drive Integration",
    "Multi-language Support (EN, ES, FR, TL)",
    "AI-Powered SOP Assistant",
    "Custom SOP Creation",
    "Role-Based Access Control",
    "Audit Logging",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold text-primary">SOPed</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">
          Simple, Transparent Pricing
        </Badge>
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          One Plan. Everything Included.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Get your painting crew trained and compliant with our comprehensive SOP platform.
          No hidden fees, no feature tiers.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-16">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {/* Monthly Plan */}
          <Card className="relative border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Monthly</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-5xl font-bold">$79</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/auth" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  Start Free Trial
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Annual Plan */}
          <Card className="relative border-2 border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                Save $158/year
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Annual</CardTitle>
              <CardDescription>Best value for your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-5xl font-bold">$790</span>
                <span className="text-muted-foreground">/year</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  That's just $65.83/month
                </p>
              </div>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/auth" className="w-full">
                <Button className="w-full" size="lg">
                  Start Free Trial
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Additional Seats */}
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-muted-foreground">
            <strong>Need more team members?</strong> Add extra seats for just{" "}
            <span className="font-semibold text-foreground">$8/month</span> per user.
          </p>
        </div>
      </section>

      {/* All Features */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-serif text-3xl font-bold">
            Everything You Need to Train Your Team
          </h2>
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
            {allFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg bg-background p-4">
                <Check className="h-5 w-5 shrink-0 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join painting contractors who trust SOPed to keep their teams trained,
            safe, and compliant.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="px-8">
                Start Your Free Trial
              </Button>
            </Link>
            <a href="mailto:support@soped.ai">
              <Button size="lg" variant="outline" className="px-8">
                Contact Sales
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted-foreground">
          <p>© 2024 SOPed. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <a href="mailto:support@soped.ai" className="hover:text-foreground">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
