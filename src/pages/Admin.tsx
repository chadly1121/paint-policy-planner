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
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Gift, 
  UserPlus, 
  Check, 
  X, 
  Clock,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { z } from "zod";

const employeeSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
  fullName: z.string().trim().min(1, { message: "Full name is required" }).max(100),
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

const Admin = () => {
  const { t } = useTranslation();
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchRedemptionRequests();
    }
  }, [isAdmin]);

  const fetchRedemptionRequests = async () => {
    setLoadingRequests(true);
    try {
      // Fetch requests
      const { data: requestsData, error } = await supabase
        .from("redemption_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (requestsData && requestsData.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(requestsData.map(r => r.user_id))];
        
        // Fetch profiles for these users
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

    const validation = employeeSchema.safeParse({ email, password, fullName });
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
          data: { full_name: fullName },
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

      // Update request status
      const { error: updateError } = await supabase
        .from("redemption_requests")
        .update({
          status: approve ? "approved" : "rejected",
          processed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, update points balance
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

      toast({
        title: approve ? "Request approved" : "Request rejected",
        description: approve
          ? `${request.points_requested} points have been redeemed.`
          : "The redemption request has been rejected.",
      });

      fetchRedemptionRequests();
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

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
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

        <TabsContent value="employees" className="space-y-6">
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
