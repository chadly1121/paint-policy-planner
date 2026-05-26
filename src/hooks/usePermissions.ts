import { useOrg } from "@/contexts/OrganizationContext";
import type { OrgRole } from "@/hooks/useOrganization";

/**
 * Centralized permission hook. Mirrors the SQL helpers
 * (is_org_admin, is_org_office, can_manage_employees, …) on the client.
 */
export function usePermissions() {
  const { orgUser } = useOrg();
  const role = (orgUser?.role ?? null) as OrgRole | null;

  const isAdmin = role === "admin";
  const isOffice = role === "office";
  const isForeman = role === "foreman";
  const isPainter = role === "painter";
  const isOther = role === "other";

  const isHsr = orgUser?.is_hsr === true;
  const isSafetySupervisor = orgUser?.is_safety_supervisor === true;

  return {
    role,
    isAdmin,
    isOffice,
    isForeman,
    isPainter,
    isOther,
    isHsr,
    isSafetySupervisor,

    // Composite permissions (must mirror SQL helpers)
    canManageEmployees: isAdmin || isOffice,
    canApproveTime: isAdmin || isOffice || isForeman,
    canManageRewards: isAdmin || isOffice,

    // Admin-only operations
    canConfigureOrg: isAdmin,
    canManageDrive: isAdmin,
    canManageAi: isAdmin,
    canManageBilling: isAdmin,
    canUpdateIncidents: isAdmin,
    canChangeRoles: isAdmin,
    canDesignateSafetyRoles: isAdmin,
  };
}
