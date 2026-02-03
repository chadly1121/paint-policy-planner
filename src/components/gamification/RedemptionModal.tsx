import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useRedemptionItems, RedemptionItem } from "@/hooks/useRedemptionItems";
import { Gift, Loader2, Coins, Check, AlertCircle } from "lucide-react";

interface RedemptionModalProps {
  open: boolean;
  onClose: () => void;
  availablePoints: number;
}

const RedemptionModal = ({ open, onClose, availablePoints }: RedemptionModalProps) => {
  const { user } = useAuth();
  const { org } = useOrganization();
  const { toast } = useToast();
  const { items, loading: itemsLoading } = useRedemptionItems();
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RedemptionItem | null>(null);
  const [confirmMode, setConfirmMode] = useState(false);

  const activeItems = items.filter(item => item.is_active);

  const handleSelectItem = (item: RedemptionItem) => {
    if (item.points_required > availablePoints) {
      toast({
        variant: "destructive",
        title: "Not enough points",
        description: `You need ${item.points_required - availablePoints} more points for this reward.`,
      });
      return;
    }
    setSelectedItem(item);
    setConfirmMode(true);
  };

  const handleConfirmRedemption = async () => {
    if (!user || !selectedItem || !org?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("redemption_requests").insert({
        user_id: user.id,
        org_id: org.id,
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        points_requested: selectedItem.points_required,
        status: "pending",
      });

      if (error) throw error;

      // Send email notification (fire and forget)
      supabase.functions.invoke("send-notification", {
        body: {
          type: "redemption_requested",
          userId: user.id,
          data: { 
            pointsRequested: selectedItem.points_required,
            itemName: selectedItem.name,
          },
        },
      }).catch(console.error);

      toast({
        title: "Request submitted!",
        description: `Your request for "${selectedItem.name}" has been sent for approval.`,
      });

      handleClose();
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

  const handleClose = () => {
    setSelectedItem(null);
    setConfirmMode(false);
    onClose();
  };

  const handleBack = () => {
    setSelectedItem(null);
    setConfirmMode(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Gift className="h-5 w-5 text-primary" />
            {confirmMode ? "Confirm Redemption" : "Redeem Points"}
          </DialogTitle>
          <DialogDescription>
            {confirmMode 
              ? "Review your selection and confirm the redemption request."
              : "Select a reward to redeem with your points."}
          </DialogDescription>
        </DialogHeader>

        {/* Points Balance */}
        <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Your Available Points</p>
            <p className="text-2xl font-bold text-primary flex items-center gap-2">
              <Coins className="h-5 w-5" />
              {availablePoints.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {itemsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : confirmMode && selectedItem ? (
            // Confirmation view
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg bg-card">
                {selectedItem.image_url ? (
                  <img 
                    src={selectedItem.image_url} 
                    alt={selectedItem.name}
                    className="h-16 w-16 object-cover rounded"
                  />
                ) : (
                  <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                    <Gift className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedItem.name}</h3>
                  {selectedItem.description && (
                    <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                  )}
                  <Badge variant="secondary" className="mt-2 font-mono">
                    <Coins className="h-3 w-3 mr-1" />
                    {selectedItem.points_required.toLocaleString()} points
                  </Badge>
                </div>
              </div>

              <div className="bg-muted border rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">After submitting:</p>
                  <ul className="list-disc list-inside mt-1 text-muted-foreground">
                    <li>Your request will be reviewed by an admin</li>
                    <li>Points will be deducted once approved</li>
                    <li>The reward will be delivered in person</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : activeItems.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No rewards available yet</p>
              <p className="text-sm text-muted-foreground">
                Check back later for new reward options
              </p>
            </div>
          ) : (
            // Item selection view
            <div className="space-y-3 py-2">
              {activeItems.map((item) => {
                const canAfford = item.points_required <= availablePoints;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    disabled={!canAfford}
                    className={`w-full flex items-start gap-4 p-4 border rounded-lg text-left transition-colors ${
                      canAfford 
                        ? "hover:bg-muted/50 hover:border-primary/50 cursor-pointer" 
                        : "opacity-60 cursor-not-allowed"
                    }`}
                  >
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="h-12 w-12 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <Gift className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        <Badge 
                          variant={canAfford ? "secondary" : "outline"} 
                          className="font-mono flex-shrink-0"
                        >
                          <Coins className="h-3 w-3 mr-1" />
                          {item.points_required.toLocaleString()}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      )}
                      {!canAfford && (
                        <p className="text-xs text-destructive mt-1">
                          Need {(item.points_required - availablePoints).toLocaleString()} more points
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {confirmMode ? (
            <>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBack} 
                className="flex-1"
                disabled={loading}
              >
                Back
              </Button>
              <Button 
                onClick={handleConfirmRedemption} 
                disabled={loading} 
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirm Request
              </Button>
            </>
          ) : (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RedemptionModal;
