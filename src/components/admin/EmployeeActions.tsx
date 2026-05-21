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
import { MoreHorizontal, Pencil, Trash2, Loader2, UserX, ShieldCheck, Shield, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

interface EmployeeActionsProps {
  employee: {
    user_id: string;
    full_name: string;
    email: string;
  };
  onUpdate: () => void;
}

export function EmployeeActions({ employee, onUpdate }: EmployeeActionsProps) {
  const { toast } = useToast();
  const { org } = useOrganization();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  
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
          <DropdownMenuItem onClick={() => {
            setNewRole("employee");
            setRoleDialogOpen(true);
          }}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Change Role
          </DropdownMenuItem>
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
    </>
  );
}
