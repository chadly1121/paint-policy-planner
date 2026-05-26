// Employee edit and remove actions component
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Pencil, Trash2, Loader2, UserX, ShieldCheck, Shield, RotateCcw, HardHat, ShieldOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";

interface EmployeeActionsProps {
  employee: {
    user_id: string;
    full_name: string;
    email: string;
    role?: string;
    is_hsr?: boolean;
    is_safety_supervisor?: boolean;
    hsr_training_completed_at?: string | null;
  };
  onUpdate: () => void;
}

export function EmployeeActions({ employee, onUpdate }: EmployeeActionsProps) {
  const { toast } = useToast();
  const { org } = useOrganization();
  const { canChangeRoles, canDesignateSafetyRoles } = usePermissions();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [hsrDialogOpen, setHsrDialogOpen] = useState(false);
  const [hsrTrainingDate, setHsrTrainingDate] = useState<string>(
    employee.hsr_training_completed_at ?? "",
  );
  const [isTogglingHsr, setIsTogglingHsr] = useState(false);
  const [isTogglingSupervisor, setIsTogglingSupervisor] = useState(false);

  const hsrEligible = employee.role === "painter" || employee.role === "other";

  // Edit form state
  const [editFullName, setEditFullName] = useState(employee.full_name);
  const [newRole, setNewRole] = useState<string>("employee");

  const handleEditSave = async () => {
    if (!editFullName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter a full name.",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editFullName.trim() })
        .eq("user_id", employee.user_id);

      if (error) throw error;

      toast({
        title: "Employee updated",
        description: `${editFullName} has been updated.`,
      });

      setEditDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: "Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveEmployee = async () => {
    if (!org?.id) return;
    
    setIsRemoving(true);
    try {
      // Deactivate the user in org_users (soft removal - keeps data for audit)
      const { error: orgUserError } = await supabase
        .from("org_users")
        .update({ is_active: false })
        .eq("user_id", employee.user_id)
        .eq("org_id", org.id);

      if (orgUserError) throw orgUserError;

      toast({
        title: "Access removed",
        description: `${employee.full_name}'s access has been revoked.`,
      });

      setRemoveDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error removing employee:", error);
      toast({
        variant: "destructive",
        title: "Failed to remove access",
        description: "Please try again.",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleChangeRole = async () => {
    if (!org?.id) return;
    
    setIsChangingRole(true);
    try {
      // Update org_users role
      const { error: orgUserError } = await supabase
        .from("org_users")
        .update({ role: newRole })
        .eq("user_id", employee.user_id)
        .eq("org_id", org.id);

      if (orgUserError) throw orgUserError;

      // Update user_roles table
      if (newRole === "admin") {
        // Add admin role if not exists
        await supabase
          .from("user_roles")
          .upsert(
            { user_id: employee.user_id, role: "admin" as const },
            { onConflict: "user_id,role" }
          );
      } else {
        // Remove admin role
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", employee.user_id)
          .eq("role", "admin");
      }

      toast({
        title: "Role updated",
        description: `${employee.full_name} is now ${newRole === "admin" ? "an admin" : `a ${newRole}`}.`,
      });

      setRoleDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error changing role:", error);
      toast({
        variant: "destructive",
        title: "Failed to change role",
        description: "Please try again.",
      });
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleRestartOnboarding = async () => {
    setIsRestarting(true);
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed_at: null })
        .eq("user_id", employee.user_id);
      if (profileErr) throw profileErr;

      const { error: progressErr } = await supabase
        .from("section_progress")
        .delete()
        .eq("user_id", employee.user_id);
      if (progressErr) throw progressErr;

      toast({
        title: "Onboarding reset",
        description: `${employee.full_name} will see the welcome wizard on next sign-in.`,
      });
      setRestartDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error restarting onboarding:", error);
      toast({
        variant: "destructive",
        title: "Failed to restart onboarding",
        description: "Please try again.",
      });
    } finally {
      setIsRestarting(false);
    }
  };


  const toggleHsr = async (newValue: boolean, trainingDate?: string) => {
    if (!org?.id) return;
    setIsTogglingHsr(true);
    try {
      const update: any = {
        is_hsr: newValue,
        hsr_designated_at: newValue ? new Date().toISOString() : null,
      };
      if (newValue) {
        update.hsr_training_completed_at = trainingDate || null;
      }
      const { error } = await supabase
        .from("org_users")
        .update(update)
        .eq("user_id", employee.user_id)
        .eq("org_id", org.id);
      if (error) throw error;
      toast({
        title: newValue ? "HSR designated" : "HSR designation removed",
        description: newValue
          ? `${employee.full_name} is now the Health & Safety Representative.`
          : `${employee.full_name} is no longer the HSR.`,
      });
      setHsrDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error("HSR toggle error:", error);
      toast({
        variant: "destructive",
        title: "Failed to update HSR",
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setIsTogglingHsr(false);
    }
  };

  const toggleSafetySupervisor = async () => {
    if (!org?.id) return;
    const newValue = !employee.is_safety_supervisor;
    setIsTogglingSupervisor(true);
    try {
      const { error } = await supabase
        .from("org_users")
        .update({
          is_safety_supervisor: newValue,
          safety_supervisor_designated_at: newValue
            ? new Date().toISOString()
            : null,
        })
        .eq("user_id", employee.user_id)
        .eq("org_id", org.id);
      if (error) throw error;
      toast({
        title: newValue
          ? "Safety Supervisor designated"
          : "Safety Supervisor removed",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update designation",
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setIsTogglingSupervisor(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => {
            setEditFullName(employee.full_name);
            setEditDialogOpen(true);
          }}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Details
          </DropdownMenuItem>
          {canChangeRoles && (
            <DropdownMenuItem onClick={() => {
              setNewRole("employee");
              setRoleDialogOpen(true);
            }}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Change Role
            </DropdownMenuItem>
          )}
          {canDesignateSafetyRoles && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem
                      disabled={!hsrEligible && !employee.is_hsr}
                      onClick={() => {
                        if (employee.is_hsr) {
                          void toggleHsr(false);
                        } else {
                          setHsrTrainingDate(employee.hsr_training_completed_at ?? "");
                          setHsrDialogOpen(true);
                        }
                      }}
                    >
                      <HardHat className="h-4 w-4 mr-2" />
                      {employee.is_hsr ? "Remove HSR designation" : "Designate as HSR"}
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                {!hsrEligible && !employee.is_hsr && (
                  <TooltipContent>
                    HSR must be a worker (painter/other), not a manager. Change role first.
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {canDesignateSafetyRoles && (
            <DropdownMenuItem
              onClick={() => void toggleSafetySupervisor()}
              disabled={isTogglingSupervisor}
            >
              {employee.is_safety_supervisor ? (
                <ShieldOff className="h-4 w-4 mr-2" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              {employee.is_safety_supervisor
                ? "Remove Safety Supervisor"
                : "Designate as Safety Supervisor"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setRestartDialogOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart Onboarding
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setRemoveDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <UserX className="h-4 w-4 mr-2" />
            Remove Access
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* HSR Designation Dialog */}
      <Dialog open={hsrDialogOpen} onOpenChange={setHsrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Designate {employee.full_name} as HSR</DialogTitle>
            <DialogDescription>
              Per OHSA s.9.1, an HSR must complete IHSA training. Enter the date
              training was completed. Only one HSR is allowed per organization —
              any current HSR will be unset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="hsr-date">HSR training completed on</Label>
            <Input
              id="hsr-date"
              type="date"
              value={hsrTrainingDate}
              onChange={(e) => setHsrTrainingDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHsrDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void toggleHsr(true, hsrTrainingDate)}
              disabled={!hsrTrainingDate || isTogglingHsr}
            >
              {isTogglingHsr ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Designating…</>
              ) : (
                "Confirm Designation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee details for {employee.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={employee.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for {employee.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-select">Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="foreman">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Foreman
                    </span>
                  </SelectItem>
                  <SelectItem value="painter">Painter</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admins have full access to manage the organization.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={isChangingRole}>
              {isChangingRole ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke {employee.full_name}'s access to the organization. 
              Their data (progress, points, certificates) will be preserved for audit purposes.
              They will no longer be able to log in or access any content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveEmployee}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Access
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restart Onboarding Dialog */}
      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart onboarding for {employee.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears their onboarding completion flag and resets their section progress
              so the guided welcome wizard appears the next time they sign in. Quiz attempts,
              certificates, and points are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartOnboarding} disabled={isRestarting}>
              {isRestarting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting…</>
              ) : (
                <><RotateCcw className="h-4 w-4 mr-2" /> Restart Onboarding</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
