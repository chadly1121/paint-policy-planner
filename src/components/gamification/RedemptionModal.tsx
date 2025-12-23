import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Gift, Loader2 } from "lucide-react";

interface RedemptionModalProps {
  open: boolean;
  onClose: () => void;
  availablePoints: number;
}

const RedemptionModal = ({ open, onClose, availablePoints }: RedemptionModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState("");

  // Placeholder values - to be configured by admin
  const POINTS_PER_DOLLAR = 100; // 100 points = $1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const points = parseInt(pointsToRedeem);
    if (isNaN(points) || points <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid number of points",
      });
      return;
    }

    if (points > availablePoints) {
      toast({
        variant: "destructive",
        title: "Insufficient points",
        description: `You only have ${availablePoints} points available`,
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("redemption_requests").insert({
        user_id: user.id,
        points_requested: points,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request submitted!",
        description: "Your redemption request has been sent for approval.",
      });

      onClose();
      setPointsToRedeem("");
    } catch (error) {
      console.error("Redemption error:", error);
      toast({
        variant: "destructive",
        title: "Request failed",
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const dollarValue = pointsToRedeem
    ? (parseInt(pointsToRedeem) / POINTS_PER_DOLLAR).toFixed(2)
    : "0.00";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Gift className="h-5 w-5 text-primary" />
            Redeem Points for Gift Cards
          </DialogTitle>
          <DialogDescription>
            Request a gift card redemption. An admin will process your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Available Points</p>
            <p className="text-3xl font-bold text-primary">{availablePoints}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {POINTS_PER_DOLLAR} points = $1.00
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Points to Redeem</Label>
            <Input
              id="points"
              type="number"
              min="100"
              max={availablePoints}
              step="100"
              value={pointsToRedeem}
              onChange={(e) => setPointsToRedeem(e.target.value)}
              placeholder="Enter points (min 100)"
            />
            {pointsToRedeem && (
              <p className="text-sm text-muted-foreground">
                Estimated value: <span className="font-semibold">${dollarValue}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !pointsToRedeem} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RedemptionModal;
