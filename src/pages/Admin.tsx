import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Gift, 
  UserPlus, 
  Check, 
  X, 
  Clock,
  Loader2,
  ShieldCheck,
  Trophy,
  RefreshCw,
  Globe,
  BarChart3,
  FileEdit
} from "lucide-react";
import { z } from "zod";
import { languages } from "@/components/LanguageSelector";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import ContentSettingsCard from "@/components/admin/ContentSettingsCard";

const employeeSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
  fullName: z.string().trim().min(1, { message: "Full name is required" }).max(100),
  preferredLanguage: z.string().min(1, { message: "Please select a language" }),
});

interface RedemptionRequest {
  id: string;
  user_id: string;
  points_requested: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
  profiles?: { full_name: string; email: string };
}

interface EmployeeData {
  user_id: string;
  full_name: string;
  email: string;
  total_points: number;
  available_points: number;
  sections_completed: number;
  created_at: string;
}

const TOTAL_SECTIONS = 5;

const Admin = () => {
  const { t } = useTranslation();
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchRedemptionRequests();
      fetchEmployees();
    }
  }, [isAdmin]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map(p => p.user_id);

        // Fetch points balances
        const { data: balances } = await supabase
          .from("points_balance")
          .select("*")
          .in("user_id", userIds);

        // Fetch section progress
        const { data: progressData } = await supabase
          .from("section_progress")
          .select("user_id, completed")
          .in("user_id", userIds)
          .eq("completed", true);

        // Count completed sections per user
        const progressMap = new Map<string, number>();
        progressData?.forEach(p => {
          const count = progressMap.get(p.user_id) || 0;
          progressMap.set(p.user_id, count + 1);
        });

        const balanceMap = new Map(balances?.map(b => [b.user_id, b]) || []);

        const employeeData: EmployeeData[] = profiles.map(profile => {
          const balance = balanceMap.get(profile.user_id);
          return {
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            total_points: balance?.total_points || 0,
            available_points: balance?.available_points ?? balance?.total_points ?? 0,
            sections_completed: progressMap.get(profile.user_id) || 0,
            created_at: profile.created_at,
          };
        });

        setEmployees(employeeData);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchRedemptionRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data: requestsData, error } = await supabase
        .from("redemption_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (requestsData && requestsData.length > 0) {
        const userIds = [...new Set(requestsData.map(r => r.user_id))];
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enrichedData: RedemptionRequest[] = requestsData.map(r => ({
          ...r,
          profiles: profileMap.get(r.user_id) || { full_name: "Unknown", email: "" }
        }));
        
        setRequests(enrichedData);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = employeeSchema.safeParse({ email, password, fullName, preferredLanguage });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { 
            full_name: fullName,
            preferred_language: preferredLanguage
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            variant: "destructive",
            title: "User already exists",
            description: "An account with this email already exists.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Employee created",
          description: `Account for ${fullName} has been created successfully.`,
        });
        setEmail("");
        setPassword("");
        setFullName("");
        setPreferredLanguage("en");
        // Refresh employee list after short delay to allow DB trigger to complete
        setTimeout(() => fetchEmployees(), 1000);
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      toast({
        variant: "destructive",
        title: "Failed to create employee",
        description: "Please try again.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleProcessRequest = async (requestId: string, approve: boolean) => {
    setProcessingId(requestId);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const { error: updateError } = await supabase
        .from("redemption_requests")
        .update({
          status: approve ? "approved" : "rejected",
          processed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (approve) {
        const { data: balance } = await supabase
          .from("points_balance")
          .select("*")
          .eq("user_id", request.user_id)
          .single();

        if (balance) {
          const newRedeemed = (balance.redeemed_points || 0) + request.points_requested;
          const newAvailable = (balance.available_points || balance.total_points) - request.points_requested;

          await supabase
            .from("points_balance")
            .update({
              redeemed_points: newRedeemed,
              available_points: Math.max(0, newAvailable),
            })
            .eq("user_id", request.user_id);
        }
      }

      // Send email notification (fire and forget)
      supabase.functions.invoke("send-notification", {
        body: {
          type: "redemption_processed",
          userId: request.user_id,
          data: {
            status: approve ? "approved" : "rejected",
            pointsRequested: request.points_requested,
            adminNotes: request.admin_notes,
          },
        },
      }).catch(console.error);

      toast({
        title: approve ? "Request approved" : "Request rejected",
        description: approve
          ? `${request.points_requested} points have been redeemed.`
          : "The redemption request has been rejected.",
      });

      fetchRedemptionRequests();
      fetchEmployees();
    } catch (error) {
      console.error("Error processing request:", error);
      toast({
        variant: "destructive",
        title: "Failed to process request",
        description: "Please try again.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage employees and redemption requests</p>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileEdit className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Redemptions
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

        <TabsContent value="content">
          <ContentSettingsCard />
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          {/* Create Employee Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create Employee Account
              </CardTitle>
              <CardDescription>
                Create a new employee account. They will receive login credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@company.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Initial Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferredLanguage" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Preferred Language
                    </Label>
                    <Select
                      value={preferredLanguage}
                      onValueChange={setPreferredLanguage}
                    >
                      <SelectTrigger id="preferredLanguage">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.preferredLanguage && (
                      <p className="text-sm text-destructive">{errors.preferredLanguage}</p>
                    )}
                </div>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Employee
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Employee Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Employees
                    <Badge variant="secondary">{employees.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    View all employees, their progress, and points
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchEmployees()}
                  disabled={loadingEmployees}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingEmployees ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : employees.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No employees found
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Trophy className="h-4 w-4" />
                            Points
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Available</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{employee.full_name}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 min-w-[120px]">
                              <div className="flex items-center justify-between text-sm">
                                <span>{employee.sections_completed}/{TOTAL_SECTIONS}</span>
                                <span className="text-muted-foreground">
                                  {Math.round((employee.sections_completed / TOTAL_SECTIONS) * 100)}%
                                </span>
                              </div>
                              <Progress 
                                value={(employee.sections_completed / TOTAL_SECTIONS) * 100} 
                                className="h-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono">
                              {employee.total_points}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono">
                              {employee.available_points}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(employee.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redemptions" className="space-y-6">
          {/* Pending Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary">{pendingRequests.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and process employee point redemption requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No pending redemption requests
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          {request.profiles?.full_name || "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.profiles?.email}
                        </p>
                        <p className="text-sm">
                          Requesting <span className="font-semibold text-primary">{request.points_requested}</span> points
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessRequest(request.id, false)}
                          disabled={processingId === request.id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleProcessRequest(request.id, true)}
                          disabled={processingId === request.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processed Requests */}
          {processedRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Request History</CardTitle>
                <CardDescription>
                  Previously processed redemption requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {processedRequests.slice(0, 10).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={request.status === "approved" ? "default" : "destructive"}
                        >
                          {request.status}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">
                            {request.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.points_requested} points
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
