import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Users, 
  Calendar, 
  Crown, 
  Loader2, 
  ExternalLink,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

export function SubscriptionCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { 
    subscription, 
    loading, 
    createCheckout, 
    openCustomerPortal,
    remainingSeats,
    isSubscribed,
    isTrial,
    checkSubscription
  } = useSubscription();
  
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleSubscribe = async (plan: "monthly" | "annual") => {
    setCheckoutLoading(true);
    try {
      await createCheckout(plan);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create checkout",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to open portal",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const usagePercent = subscription 
    ? (subscription.current_users / subscription.user_limit) * 100 
    : 0;

  const isNearLimit = usagePercent >= 80;
  const isAtLimit = subscription?.current_users === subscription?.user_limit;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle>Subscription</CardTitle>
          </div>
          {subscription && (
            <Badge variant={isSubscribed ? "default" : "secondary"}>
              {isSubscribed ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </>
              ) : (
                "Trial"
              )}
            </Badge>
          )}
        </div>
        <CardDescription>
          Manage your SOPed Pro subscription and team seats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Seats Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Team Members</span>
            </div>
            <span className="font-medium">
              {subscription?.current_users || 0} / {subscription?.user_limit || 6}
            </span>
          </div>
          <Progress 
            value={usagePercent} 
            className={isNearLimit ? "bg-warning/20" : undefined}
          />
          {isAtLimit && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>You've reached your user limit. Upgrade to add more team members.</span>
            </div>
          )}
          {!isAtLimit && remainingSeats > 0 && (
            <p className="text-xs text-muted-foreground">
              {remainingSeats} seat{remainingSeats !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>

        {/* Subscription Details or Upgrade Options */}
        {isSubscribed ? (
          <div className="space-y-4">
            {subscription?.subscription_end && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {subscription.cancel_at_period_end ? "Expires" : "Renews"} on{" "}
                  {new Date(subscription.subscription_end).toLocaleDateString()}
                </span>
                {subscription.cancel_at_period_end && (
                  <Badge variant="destructive" className="text-xs">Cancelling</Badge>
                )}
              </div>
            )}
            <Button 
              onClick={handleManageSubscription} 
              variant="outline" 
              className="w-full"
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Manage Subscription
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">SOPed Pro</h4>
                  <p className="text-sm text-muted-foreground">
                    6 users included • Additional seats $8/mo each
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleSubscribe("monthly")}
                  disabled={checkoutLoading}
                  className="w-full"
                >
                  {checkoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "$79/mo"
                  )}
                </Button>
                <Button 
                  onClick={() => handleSubscribe("annual")}
                  disabled={checkoutLoading}
                  variant="outline"
                  className="w-full"
                >
                  {checkoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>$790/yr <Badge variant="secondary" className="ml-1 text-xs">Save $158</Badge></>
                  )}
                </Button>
              </div>
            </div>
            
            {isTrial && (
              <p className="text-xs text-muted-foreground text-center">
                You're on a free trial with up to 6 team members.
                Subscribe to unlock unlimited features.
              </p>
            )}
          </div>
        )}

        {/* Refresh Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => checkSubscription()}
          className="w-full text-xs"
        >
          Refresh subscription status
        </Button>
      </CardContent>
    </Card>
  );
}
