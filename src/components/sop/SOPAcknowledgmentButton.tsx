import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileSignature, Loader2 } from "lucide-react";
import { useSOPAssignments } from "@/hooks/useSOPAssignments";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SOPAcknowledgmentButtonProps {
  sopKey: string;
  sopVersion?: number;
}

const SOPAcknowledgmentButton = ({ sopKey, sopVersion = 1 }: SOPAcknowledgmentButtonProps) => {
  const { hasAcknowledged, getAcknowledgment, acknowledgeSOP } = useSOPAssignments();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const isAcknowledged = hasAcknowledged(sopKey, sopVersion);
  const acknowledgment = getAcknowledgment(sopKey);

  const handleAcknowledge = async () => {
    setLoading(true);
    const { error } = await acknowledgeSOP(sopKey, sopVersion);
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to acknowledge",
        description: "Please try again.",
      });
      return;
    }

    toast({
      title: "SOP Acknowledged",
      description: "Your acknowledgment has been recorded.",
    });
  };

  if (isAcknowledged && acknowledgment) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 gap-1">
        <CheckCircle className="h-3 w-3" />
        Acknowledged {format(new Date(acknowledgment.acknowledged_at), "MMM d")}
      </Badge>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleAcknowledge}
      disabled={loading}
      className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <FileSignature className="h-3 w-3 mr-1" />
      )}
      Acknowledge
    </Button>
  );
};

export default SOPAcknowledgmentButton;
