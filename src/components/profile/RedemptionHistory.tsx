import { format } from "date-fns";
import { Gift, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRedemptionHistory } from "@/hooks/useRedemptionHistory";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
  }
};

const RedemptionHistory = () => {
  const { requests, isLoading } = useRedemptionHistory();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Redemption History
        </CardTitle>
        <CardDescription>
          Track the status of your reward redemption requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No redemption requests yet. Earn points and redeem them for rewards!
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {request.item_name || "Gift Card Redemption"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.points_requested} points •{" "}
                    {format(new Date(request.created_at), "MMM d, yyyy")}
                  </p>
                  {request.admin_notes && request.status !== "pending" && (
                    <p className="text-xs text-muted-foreground italic">
                      Note: {request.admin_notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(request.status)}
                  {request.processed_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(request.processed_at), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RedemptionHistory;
