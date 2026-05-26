import { NavLink, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home,
  ClipboardList,
  Shield,
  FileText,
  GraduationCap,
  AlertTriangle,
  Search,
  PaintBucket,
  ShieldCheck,
  Settings,
  UserCircle,
  FlaskConical,
  FileSpreadsheet,
  AlertOctagon,
  Scale,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useOrg } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  group: string | null;
  items: NavItem[];
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAdmin, isOffice } = usePermissions();
  const { org } = useOrg();
  const [searchQuery, setSearchQuery] = useState("");
  const showAdminSection = isAdmin || isOffice;

  const navSections: NavSection[] = [
    {
      group: null,
      items: [{ path: "/", label: t("nav.dashboard"), icon: Home }],
    },
    {
      group: t("nav.documents"),
      items: [
        { path: "/policies", label: t("nav.companyPolicies"), icon: FileText },
        { path: "/sops", label: t("nav.sops"), icon: ClipboardList },
        { path: "/safety", label: t("nav.safetyProtocols"), icon: Shield },
        { path: "/sds", label: t("nav.sds"), icon: FlaskConical },
        { path: "/training", label: t("nav.trainingRequirements"), icon: GraduationCap },
        { path: "/disciplinary", label: t("nav.disciplinaryProcedures"), icon: AlertTriangle },
        { path: "/forms", label: t("nav.forms"), icon: FileSpreadsheet },
      ],
    },
    {
      group: t("nav.report"),
      items: [{ path: "/incidents", label: t("nav.incidentReports"), icon: AlertOctagon }],
    },
    {
      group: t("nav.me"),
      items: [
        { path: "/profile", label: t("nav.myProfile"), icon: UserCircle },
        { path: "/settings", label: t("nav.settings"), icon: Settings },
      ],
    },
    ...(showAdminSection
      ? [
          {
            group: t("nav.adminOnly"),
            items: [{ path: "/admin", label: t("nav.adminPanel"), icon: ShieldCheck }],
          },
        ]
      : []),
  ];

  const query = searchQuery.trim().toLowerCase();
  const allItems = navSections.flatMap((s) => s.items);
  const searchResults = query
    ? allItems.filter((item) => item.label.toLowerCase().includes(query))
    : null;

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <li key={item.path}>
        <NavLink
          to={item.path}
          onClick={onClose}
          className={`nav-item ${isActive ? "nav-item-active" : ""}`}
        >
          <Icon className="h-5 w-5" />
          <span className="font-medium">{item.label}</span>
        </NavLink>
      </li>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen w-72 bg-sidebar transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent overflow-hidden">
            {org?.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name || t("common.companyName")}
                className="h-full w-full object-contain"
              />
            ) : (
              <PaintBucket className="h-5 w-5 text-sidebar-primary" />
            )}
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold text-sidebar-foreground">
              {org?.name || t("common.companyName")}
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
            <Input
              placeholder={t("common.searchSections")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-sidebar-border bg-sidebar-accent pl-10 text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:ring-sidebar-ring"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 scrollbar-thin pb-4">
          {searchResults ? (
            <ul className="space-y-1">{searchResults.map(renderItem)}</ul>
          ) : (
            navSections.map((section, idx) => (
              <div key={section.group ?? `__ungrouped-${idx}`}>
                {section.group && (
                  <p className="px-3 mb-1 mt-4 text-xs uppercase tracking-wider text-sidebar-foreground/60">
                    {section.group}
                  </p>
                )}
                <ul className="space-y-1">{section.items.map(renderItem)}</ul>
              </div>
            ))
          )}
        </nav>

        {/* Legal Links */}
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2 mb-2 text-sidebar-foreground/60">
            <Scale className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Legal & Compliance</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <Link
              to="/compliance-guidance"
              onClick={onClose}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              Guidance
            </Link>
            <Link
              to="/terms"
              onClick={onClose}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              onClick={onClose}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-6 py-3">
          <p className="text-xs text-sidebar-foreground/50">
            {t("common.lastUpdated")}: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
