import React, { createContext, useContext, ReactNode } from "react";
import { useOrganization, OrgRole } from "@/hooks/useOrganization";

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  tagline: string | null;
  created_at: string;
}

interface OrgUser {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
  created_at: string;
}

interface OrgMember extends OrgUser {
  profile?: {
    full_name: string;
    email: string;
  };
}

interface OrganizationContextType {
  org: Organization | null;
  orgUser: OrgUser | null;
  members: OrgMember[];
  loading: boolean;
  isOrgAdmin: boolean;
  hasOrg: boolean;
  role: OrgRole | null;
  createOrganization: (name: string) => Promise<{ org: Organization | null; error: Error | null }>;
  inviteMember: (userId: string, role: OrgRole) => Promise<{ member: OrgUser | null; error: Error | null }>;
  updateMemberRole: (memberId: string, newRole: OrgRole) => Promise<{ error: Error | null }>;
  deactivateMember: (memberId: string) => Promise<{ error: Error | null }>;
  refresh: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const organization = useOrganization();

  return (
    <OrganizationContext.Provider value={organization}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within an OrganizationProvider");
  }
  return context;
};
