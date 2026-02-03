import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, Gift, Coins } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import RedemptionModal from "./RedemptionModal";

const PointsDisplay = () => {
  const { points, getCompletedSectionsCount, SECTIONS, loading } = useProgress();
  const [redemptionOpen, setRedemptionOpen] = useState(false);

  const completedCount = getCompletedSectionsCount();
  const totalSections = SECTIONS.length;
  const progressPercent = (completedCount / totalSections) * 100;

  if (loading || !points) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-serif">
            <Coins className="h-5 w-5 text-primary" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-primary">{points.available_points}</p>
              <p className="text-sm text-muted-foreground">Available Points</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{points.total_points}</p>
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Manual Progress</span>
              <span>{completedCount}/{totalSections} sections</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          <div className="flex items-center gap-2 pt-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < completedCount
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={() => setRedemptionOpen(true)}
            className="w-full"
            variant="outline"
          >
            <Gift className="h-4 w-4 mr-2" />
            Redeem Points
          </Button>
        </CardContent>
      </Card>

      <RedemptionModal
        open={redemptionOpen}
        onClose={() => setRedemptionOpen(false)}
        availablePoints={points.available_points}
      />
    </>
  );
};

export default PointsDisplay;
