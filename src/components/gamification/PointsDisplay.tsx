import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Gift, Coins } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import RedemptionModal from "./RedemptionModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PointsDisplay = () => {
  const { points, loading } = useProgress();
  const { session } = useAuth();
  const [redemptionOpen, setRedemptionOpen] = useState(false);
  const [driveProgress, setDriveProgress] = useState({ completed: 0, total: 0, points: 0 });
  const [loadingDrive, setLoadingDrive] = useState(true);

  // Calculate progress based only on Drive-backed SOPs
  useEffect(() => {
    const fetchDriveProgress = async () => {
      if (!session?.access_token) return;
      
      try {
        // Fetch Drive files for SOPs folder
        const response = await supabase.functions.invoke('drive-list-files', {
          body: { folder_type: 'sops' },
        });

        if (!response.data?.files) {
          setLoadingDrive(false);
          return;
        }

        const driveFileIds = new Set(
          response.data.files
            .filter((f: any) => !f.name?.startsWith('_TEMPLATE'))
            .map((f: any) => f.id)
        );

        // Get SOPs that are in Drive
        const { data: sops } = await supabase
          .from('sops')
          .select('id, drive_file_id')
          .eq('source', 'org')
          .not('drive_file_id', 'is', null);

        const validSopIds = (sops || [])
          .filter(s => s.drive_file_id && driveFileIds.has(s.drive_file_id))
          .map(s => s.id);

        // Get user's progress on these SOPs
        const { data: progress } = await supabase
          .from('section_item_progress')
          .select('item_key, completed, points_earned')
          .eq('user_id', session.user.id)
          .eq('section_key', 'sops');

        const completedCount = (progress || []).filter(
          p => p.completed && validSopIds.includes(p.item_key)
        ).length;

        const pointsEarned = (progress || [])
          .filter(p => p.completed && validSopIds.includes(p.item_key))
          .reduce((sum, p) => sum + (p.points_earned || 0), 0);

        setDriveProgress({
          completed: completedCount,
          total: validSopIds.length,
          points: pointsEarned,
        });
      } catch (error) {
        console.error('Error fetching drive progress:', error);
      } finally {
        setLoadingDrive(false);
      }
    };

    fetchDriveProgress();
  }, [session?.access_token]);

  const progressPercent = driveProgress.total > 0 
    ? (driveProgress.completed / driveProgress.total) * 100 
    : 0;

  if (loading || loadingDrive || !points) {
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
              <p className="text-3xl font-bold text-primary">{driveProgress.points}</p>
              <p className="text-sm text-muted-foreground">Points Earned</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{Math.max(0, driveProgress.points - (points?.redeemed_points || 0))}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>SOP Progress</span>
              <span>{driveProgress.completed}/{driveProgress.total} completed</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {Math.max(0, driveProgress.points - (points?.redeemed_points || 0)) > 0 ? (
            <Button
              onClick={() => setRedemptionOpen(true)}
              className="w-full"
              variant="outline"
            >
              <Gift className="h-4 w-4 mr-2" />
              Redeem Points
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground italic text-center pt-2">
              Earn points by completing acknowledgements to redeem rewards.
            </p>
          )}
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
