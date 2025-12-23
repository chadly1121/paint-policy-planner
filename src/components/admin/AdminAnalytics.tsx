import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Users,
  Trophy,
  CheckCircle,
  TrendingUp,
  Clock,
  Award,
  Loader2,
} from "lucide-react";

interface AnalyticsData {
  totalEmployees: number;
  activeEmployees: number;
  totalQuizAttempts: number;
  passedQuizzes: number;
  averageScore: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  completionBySection: Record<string, number>;
  recentActivity: {
    action: string;
    count: number;
  }[];
}

const SECTION_LABELS: Record<string, string> = {
  sops: "SOPs",
  safety: "Safety",
  policies: "Policies",
  training: "Training",
  disciplinary: "Disciplinary",
};

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all profiles (total employees)
      const { data: profiles, count: totalEmployees } = await supabase
        .from("profiles")
        .select("*", { count: "exact" });

      // Fetch quiz attempts
      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("*");

      // Fetch section progress
      const { data: sectionProgress } = await supabase
        .from("section_progress")
        .select("section_key, completed, user_id");

      // Fetch points balances
      const { data: balances } = await supabase
        .from("points_balance")
        .select("total_points, redeemed_points");

      // Calculate completion by section
      const completionBySection: Record<string, number> = {};
      const completedProgress = sectionProgress?.filter(p => p.completed) || [];
      completedProgress.forEach(p => {
        completionBySection[p.section_key] = (completionBySection[p.section_key] || 0) + 1;
      });

      // Calculate active employees (have at least one quiz attempt or section progress)
      const activeUserIds = new Set([
        ...(quizAttempts?.map(q => q.user_id) || []),
        ...(sectionProgress?.filter(p => p.completed).map(p => p.user_id) || []),
      ]);

      // Calculate quiz stats
      const passedQuizzes = quizAttempts?.filter(q => q.passed).length || 0;
      const totalScore = quizAttempts?.reduce((sum, q) => sum + (q.score / q.total_questions) * 100, 0) || 0;
      const averageScore = quizAttempts && quizAttempts.length > 0 
        ? Math.round(totalScore / quizAttempts.length) 
        : 0;

      // Calculate points
      const totalPointsEarned = balances?.reduce((sum, b) => sum + (b.total_points || 0), 0) || 0;
      const totalPointsRedeemed = balances?.reduce((sum, b) => sum + (b.redeemed_points || 0), 0) || 0;

      setAnalytics({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeUserIds.size,
        totalQuizAttempts: quizAttempts?.length || 0,
        passedQuizzes,
        averageScore,
        totalPointsEarned,
        totalPointsRedeemed,
        completionBySection,
        recentActivity: [],
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load analytics
      </div>
    );
  }

  const passRate = analytics.totalQuizAttempts > 0 
    ? Math.round((analytics.passedQuizzes / analytics.totalQuizAttempts) * 100) 
    : 0;

  const engagementRate = analytics.totalEmployees > 0
    ? Math.round((analytics.activeEmployees / analytics.totalEmployees) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeEmployees} active ({engagementRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quiz Pass Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.passedQuizzes}/{analytics.totalQuizAttempts} passed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              Across all quiz attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Points Awarded</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPointsEarned}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalPointsRedeemed} redeemed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section Completion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Section Completion Rates
          </CardTitle>
          <CardDescription>
            Number of employees who completed each section
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(SECTION_LABELS).map(([key, label]) => {
            const completed = analytics.completionBySection[key] || 0;
            const percentage = analytics.totalEmployees > 0 
              ? Math.round((completed / analytics.totalEmployees) * 100)
              : 0;

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{completed} completed</Badge>
                    <span className="text-muted-foreground w-12 text-right">{percentage}%</span>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Points Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Earned</span>
              <Badge variant="default" className="font-mono">
                {analytics.totalPointsEarned} pts
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Redeemed</span>
              <Badge variant="secondary" className="font-mono">
                {analytics.totalPointsRedeemed} pts
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available</span>
              <Badge variant="outline" className="font-mono">
                {analytics.totalPointsEarned - analytics.totalPointsRedeemed} pts
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiz Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Attempts</span>
              <Badge variant="secondary">{analytics.totalQuizAttempts}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Passed</span>
              <Badge variant="default" className="bg-green-600">
                {analytics.passedQuizzes}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Failed</span>
              <Badge variant="destructive">
                {analytics.totalQuizAttempts - analytics.passedQuizzes}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
