import { NavLink, useLocation } from "react-router-dom";
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
  Sparkles,
  AlertOctagon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrganizationContext";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { org } = useOrg();
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { path: "/", label: t("nav.dashboard"), icon: Home },
    { path: "/profile", label: "My Profile", icon: UserCircle },
    { path: "/sops", label: t("nav.sops"), icon: ClipboardList },
    { path: "/safety", label: t("nav.safetyProtocols"), icon: Shield },
    { path: "/sds", label: "Safety Data Sheets", icon: FlaskConical },
    { path: "/policies", label: t("nav.companyPolicies"), icon: FileText },
    { path: "/training", label: t("nav.trainingRequirements"), icon: GraduationCap },
    { path: "/disciplinary", label: t("nav.disciplinaryProcedures"), icon: AlertTriangle },
    { path: "/incidents", label: "Incident Reports", icon: AlertOctagon },
    { path: "/builder", label: "Document Builder", icon: Sparkles },
    { path: "/settings", label: t("nav.settings"), icon: Settings },
    ...(isAdmin ? [{ path: "/admin", label: t("nav.admin"), icon: ShieldCheck }] : []),
  ];

  const filteredItems = navItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <p className="text-xs text-sidebar-foreground/60">
              {org?.tagline || t("common.employeeManual")}
            </p>
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
        <nav className="flex-1 overflow-y-auto px-3 scrollbar-thin">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
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
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-6 py-4">
          <p className="text-xs text-sidebar-foreground/50">
            {t("common.lastUpdated")}: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
