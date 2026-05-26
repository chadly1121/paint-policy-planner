import { useState, useCallback } from "react";
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
import { toast as sonnerToast } from "sonner";
import { AlertTriangle, Plus, FileText, Calendar, MapPin, ExternalLink, Clock, Upload, X, Image as ImageIcon, FileIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { DriveRequiredGuard } from "@/components/drive/DriveRequiredGuard";
import { useDropzone } from "react-dropzone";

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

interface IncidentAttachment {
  id: string;
  incident_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  drive_web_view_link: string;
  drive_file_id: string;
  uploaded_at: string;
}

const severityColors: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  moderate: "bg-orange-100 text-orange-800 border-orange-200",
  severe: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-red-200 text-red-900 border-red-300",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  in_review: "bg-purple-100 text-purple-800 border-purple-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_MIME: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/heic": [".heic"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const IncidentReports = () => {
  useTranslation();
  const { user } = useAuth();
  const { org, isOrgAdmin } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

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
    is_near_miss: false,
  });

  const onDrop = useCallback((accepted: File[]) => {
    const valid = accepted.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${f.name} exceeds 25 MB`, variant: "destructive" });
        return false;
      }
      return true;
    });
    setPendingFiles((prev) => [...prev, ...valid]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME,
    maxSize: MAX_FILE_SIZE,
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["incident-reports", org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      const { data, error } = await supabase
        .from("incident_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as IncidentReport[];
    },
    enabled: !!org?.id,
  });

  const { data: attachmentsByIncident } = useQuery({
    queryKey: ["incident-attachments", org?.id],
    queryFn: async () => {
      if (!org?.id) return {};
      const { data, error } = await supabase
        .from("incident_report_attachments")
        .select("*")
        .order("uploaded_at", { ascending: true });
      if (error) throw error;
      const map: Record<string, IncidentAttachment[]> = {};
      (data as IncidentAttachment[]).forEach((a) => {
        (map[a.incident_id] ||= []).push(a);
      });
      return map;
    },
    enabled: !!org?.id,
  });

  const uploadAttachment = async (incidentId: string, file: File) => {
    const base64 = await fileToBase64(file);
    const { data, error } = await supabase.functions.invoke("upload-incident-attachment", {
      body: {
        incident_id: incidentId,
        file: base64,
        file_name: file.name,
        mime_type: file.type,
      },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const regenerateDoc = async (incidentId: string) => {
    try {
      await supabase.functions.invoke("regenerate-incident-doc", { body: { incident_id: incidentId } });
    } catch (e) {
      console.warn("regenerate-incident-doc failed:", e);
      toast({
        title: "Drive file regeneration pending",
        description: "Updated in database. Admin will retry shortly.",
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await supabase.functions.invoke("create-incident-report", { body: data });
      if (response.error) throw response.error;
      if ((response.data as any)?.error) throw new Error((response.data as any).error);
      return response.data as {
        incident_id: string;
        drive_web_view_link: string | null;
        emailNotificationSent: boolean;
        emailNotificationReason: string;
      };
    },
    onSuccess: async (data, variables) => {
      // Upload attachments sequentially
      let attachmentErrors = 0;
      for (const f of pendingFiles) {
        try { await uploadAttachment(data.incident_id, f); }
        catch (e) {
          attachmentErrors++;
          console.error("Attachment upload failed:", e);
        }
      }
      if (pendingFiles.length > 0 && attachmentErrors < pendingFiles.length) {
        await regenerateDoc(data.incident_id);
      }

      queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
      queryClient.invalidateQueries({ queryKey: ["incident-attachments"] });
      setIsDialogOpen(false);
      resetForm();

      const isSevere = variables.severity === "severe" || variables.severity === "critical";
      if (!isSevere) {
        toast({
          title: "Report saved",
          description: data.drive_web_view_link ? "Synced to Google Drive." : undefined,
        });
      } else if (data.emailNotificationSent) {
        toast({ title: "Report saved", description: "Admins notified by email." });
      } else {
        sonnerToast.error("Admin email NOT sent", {
          description: `Report saved, but the admin email notification did NOT go out (reason: ${data.emailNotificationReason}). Call your supervisor directly to ensure they know.`,
          duration: 15000,
        });
      }

      if (attachmentErrors > 0) {
        toast({
          title: `${attachmentErrors} attachment(s) failed`,
          description: "Report was saved but some files did not upload.",
          variant: "destructive",
        });
      }

      // Critical injury (CA) alert path retained
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

      if (data.drive_web_view_link) window.open(data.drive_web_view_link, "_blank");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("incident_reports")
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
      toast({ title: "Status updated" });
      regenerateDoc(id);
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachment: IncidentAttachment) => {
      const { error } = await supabase
        .from("incident_report_attachments")
        .delete()
        .eq("id", attachment.id);
      if (error) throw error;
      return attachment;
    },
    onSuccess: (attachment) => {
      queryClient.invalidateQueries({ queryKey: ["incident-attachments"] });
      toast({ title: "Attachment removed" });
      regenerateDoc(attachment.incident_id);
    },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setFormData({
      incident_date: format(new Date(), "yyyy-MM-dd"),
      incident_time: "", location: "", description: "",
      injuries_reported: false, injury_details: "", witnesses: "",
      immediate_actions: "", root_cause: "", corrective_actions: "",
      severity: "minor", is_near_miss: false,
    });
    setPendingFiles([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const openDriveFile = (fileId: string) =>
    window.open(`https://docs.google.com/document/d/${fileId}/edit`, "_blank");

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

          <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Report Incident</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report New Incident</DialogTitle>
                <DialogDescription>
                  Provide details about the incident. Fields marked with * are required.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="incident_date">Date of Incident *</Label>
                    <Input id="incident_date" type="date" value={formData.incident_date}
                      onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incident_time">Time of Incident</Label>
                    <Input id="incident_time" type="time" value={formData.incident_time}
                      onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input id="location" placeholder="Job site, address, or area" value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity *</Label>
                    <Select value={formData.severity}
                      onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor - No injury/minimal damage</SelectItem>
                        <SelectItem value="moderate">Moderate - Minor injury/some damage</SelectItem>
                        <SelectItem value="severe">Severe - Serious injury/significant damage</SelectItem>
                        <SelectItem value="critical">Critical - Life-threatening/severe damage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description of Incident *</Label>
                  <Textarea id="description" placeholder="Describe what happened in detail..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4} required />
                </div>

                {/* Attachments dropzone */}
                <div className="space-y-2">
                  <Label>Attach photos or documents (optional, max 25 MB each)</Label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
                      isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drop files here or click to browse · JPG, PNG, HEIC, WebP, PDF
                    </p>
                  </div>
                  {pendingFiles.length > 0 && (
                    <ul className="space-y-1">
                      {pendingFiles.map((f, i) => (
                        <li key={i} className="flex items-center justify-between text-sm p-2 bg-muted/40 rounded">
                          <span className="flex items-center gap-2 truncate">
                            {f.type.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
                            <span className="truncate">{f.name}</span>
                            <span className="text-xs text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span>
                          </span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="injuries_reported" checked={formData.injuries_reported}
                    onCheckedChange={(c) => setFormData({ ...formData, injuries_reported: c })} />
                  <Label htmlFor="injuries_reported">Were there any injuries?</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="is_near_miss" checked={formData.is_near_miss}
                    onCheckedChange={(c) => setFormData({ ...formData, is_near_miss: c })} />
                  <Label htmlFor="is_near_miss">
                    Near miss? (no injury, but close call — helps us spot hazards)
                  </Label>
                </div>

                {formData.injuries_reported && (
                  <div className="space-y-2">
                    <Label htmlFor="injury_details">Injury Details</Label>
                    <Textarea id="injury_details" value={formData.injury_details}
                      onChange={(e) => setFormData({ ...formData, injury_details: e.target.value })} rows={2} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="witnesses">Witnesses</Label>
                  <Input id="witnesses" value={formData.witnesses}
                    onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="immediate_actions">Immediate Actions Taken</Label>
                  <Textarea id="immediate_actions" value={formData.immediate_actions}
                    onChange={(e) => setFormData({ ...formData, immediate_actions: e.target.value })} rows={2} />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
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
            {reports.map((report) => {
              const atts = attachmentsByIncident?.[report.id] || [];
              return (
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
                              <Clock className="h-3 w-3" />{report.incident_time}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={severityColors[report.severity]}>{report.severity}</Badge>
                        <Badge className={statusColors[report.status]}>{report.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(report.severity === "severe" || report.severity === "critical") &&
                      report.injuries_reported &&
                      (org?.jurisdiction ?? "").startsWith("CA") && (
                        <div className="rounded-md border-2 border-amber-400 bg-amber-50 p-4 text-amber-900">
                          <p className="font-semibold flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <span>
                              This may be a critical injury under Ontario OHSA s.51. The employer must notify the Ministry of Labour by telephone within 48 hours, and in writing within 14 days. Notify the JHSC (if applicable) and union (if any).{" "}
                              <a href="https://www.ontario.ca/page/report-workplace-incident"
                                target="_blank" rel="noopener noreferrer"
                                className="underline font-bold text-amber-900 hover:text-amber-700">
                                → Report at ontario.ca
                              </a>
                            </span>
                          </p>
                        </div>
                      )}

                    <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>

                    {report.injuries_reported && (
                      <Badge variant="destructive" className="text-xs">Injuries Reported</Badge>
                    )}

                    {atts.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Attachments ({atts.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {atts.map((a) => (
                            <div key={a.id} className="flex items-center gap-1 text-xs bg-muted/40 rounded px-2 py-1">
                              <a href={a.drive_web_view_link} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:underline">
                                {a.mime_type.startsWith("image/")
                                  ? <ImageIcon className="h-3 w-3" />
                                  : <FileIcon className="h-3 w-3" />}
                                <span className="truncate max-w-[180px]">{a.file_name}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {isOrgAdmin && (
                                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1"
                                  onClick={() => deleteAttachmentMutation.mutate(a)}
                                  disabled={deleteAttachmentMutation.isPending}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        Reported {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      <div className="flex items-center gap-2">
                        {report.drive_file_id && (
                          <Button variant="outline" size="sm" onClick={() => openDriveFile(report.drive_file_id!)} className="gap-1">
                            <FileText className="h-3 w-3" />View in Drive
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {isOrgAdmin && (
                          <Select value={report.status}
                            onValueChange={(v) => updateStatusMutation.mutate({ id: report.id, status: v })}>
                            <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_review">In Review</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
