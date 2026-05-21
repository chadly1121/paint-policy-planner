import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, FileText, Calendar, MapPin, User, ExternalLink, Clock } from "lucide-react";
import { format } from "date-fns";
import { DriveRequiredGuard } from "@/components/drive/DriveRequiredGuard";

interface IncidentReport {
  id: string;
  incident_date: string;
  incident_time: string | null;
  location: string;
  description: string;
  injuries_reported: boolean;
  injury_details: string | null;
  witnesses: string | null;
  immediate_actions: string | null;
  root_cause: string | null;
  corrective_actions: string | null;
  status: string;
  severity: string;
  drive_file_id: string | null;
  created_at: string;
  reported_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

const severityColors: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  moderate: "bg-orange-100 text-orange-800 border-orange-200",
  major: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-red-200 text-red-900 border-red-300",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  investigating: "bg-purple-100 text-purple-800 border-purple-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const IncidentReports = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { org, isOrgAdmin } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    incident_date: format(new Date(), "yyyy-MM-dd"),
    incident_time: "",
    location: "",
    description: "",
    injuries_reported: false,
    injury_details: "",
    witnesses: "",
    immediate_actions: "",
    root_cause: "",
    corrective_actions: "",
    severity: "minor",
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["incident-reports", org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      const { data, error } = await supabase
        .from("incident_reports")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as IncidentReport[];
    },
    enabled: !!org?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await supabase.functions.invoke("create-incident-report", {
        body: data,
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Incident Report Submitted",
        description: data.drive_web_view_link 
          ? "Report saved and synced to Google Drive. Admins have been notified."
          : "Report saved. Admins have been notified.",
      });

      // Critical injury alert: severe + injuries + CA jurisdiction
      const isSevere = variables.severity === "severe" || variables.severity === "critical";
      const isCA = (org?.jurisdiction ?? "").startsWith("CA");
      if (isSevere && variables.injuries_reported && isCA && user?.id && org?.id) {
        supabase.functions.invoke("send-notification", {
          body: {
            type: "critical_injury_alert",
            userId: user.id,
            data: {
              orgId: org.id,
              incidentId: data?.incident_id,
              incidentDate: variables.incident_date,
              location: variables.location,
              description: variables.description,
              injuryDetails: variables.injury_details,
            },
          },
        }).catch((err) => console.error("Failed to dispatch critical_injury_alert:", err));
      }

      if (data.drive_web_view_link) {
        window.open(data.drive_web_view_link, "_blank");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit incident report",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("incident_reports")
        .update({ 
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
      toast({ title: "Status Updated" });
    },
  });

  const resetForm = () => {
    setFormData({
      incident_date: format(new Date(), "yyyy-MM-dd"),
      incident_time: "",
      location: "",
      description: "",
      injuries_reported: false,
      injury_details: "",
      witnesses: "",
      immediate_actions: "",
      root_cause: "",
      corrective_actions: "",
      severity: "minor",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const openDriveFile = async (fileId: string) => {
    window.open(`https://docs.google.com/document/d/${fileId}/edit`, "_blank");
  };

  return (
    <DriveRequiredGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              Incident Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Report and track workplace incidents for safety compliance
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report New Incident</DialogTitle>
                <DialogDescription>
                  Provide details about the incident. All fields marked with * are required.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="incident_date">Date of Incident *</Label>
                    <Input
                      id="incident_date"
                      type="date"
                      value={formData.incident_date}
                      onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incident_time">Time of Incident</Label>
                    <Input
                      id="incident_time"
                      type="time"
                      value={formData.incident_time}
                      onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="Job site, address, or area"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity *</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value) => setFormData({ ...formData, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor - No injury/minimal damage</SelectItem>
                        <SelectItem value="moderate">Moderate - Minor injury/some damage</SelectItem>
                        <SelectItem value="major">Major - Serious injury/significant damage</SelectItem>
                        <SelectItem value="critical">Critical - Life-threatening/severe damage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description of Incident *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what happened in detail..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="injuries_reported"
                    checked={formData.injuries_reported}
                    onCheckedChange={(checked) => setFormData({ ...formData, injuries_reported: checked })}
                  />
                  <Label htmlFor="injuries_reported">Were there any injuries?</Label>
                </div>

                {formData.injuries_reported && (
                  <div className="space-y-2">
                    <Label htmlFor="injury_details">Injury Details</Label>
                    <Textarea
                      id="injury_details"
                      placeholder="Describe the injuries and who was affected..."
                      value={formData.injury_details}
                      onChange={(e) => setFormData({ ...formData, injury_details: e.target.value })}
                      rows={2}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="witnesses">Witnesses</Label>
                  <Input
                    id="witnesses"
                    placeholder="Names of any witnesses"
                    value={formData.witnesses}
                    onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="immediate_actions">Immediate Actions Taken</Label>
                  <Textarea
                    id="immediate_actions"
                    placeholder="What actions were taken immediately after the incident?"
                    value={formData.immediate_actions}
                    onChange={(e) => setFormData({ ...formData, immediate_actions: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Submitting..." : "Submit Report"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading incident reports...</div>
        ) : reports && reports.length > 0 ? (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {report.location}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.incident_date), "MMM d, yyyy")}
                        </span>
                        {report.incident_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {report.incident_time}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={severityColors[report.severity]}>
                        {report.severity}
                      </Badge>
                      <Badge className={statusColors[report.status]}>
                        {report.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {report.description}
                  </p>
                  
                  {report.injuries_reported && (
                    <Badge variant="destructive" className="text-xs">
                      Injuries Reported
                    </Badge>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Reported {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {report.drive_file_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDriveFile(report.drive_file_id!)}
                          className="gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          View in Drive
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {isOrgAdmin && (
                        <Select
                          value={report.status}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: report.id, status: value })}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="investigating">Investigating</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Incident Reports</h3>
            <p className="text-muted-foreground mb-4">
              No incidents have been reported yet. Click "Report Incident" to file a new report.
            </p>
          </Card>
        )}
      </div>
    </DriveRequiredGuard>
  );
};

export default IncidentReports;
