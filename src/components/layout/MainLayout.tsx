import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const pageTitles: Record<string, string> = {
  "/": "Employee Handbook",
  "/profile": "My Profile",
  "/sops": "Standard Operating Procedures",
  "/safety": "Safety Protocols",
  "/policies": "Company Policies",
  "/training": "Training Requirements",
  "/disciplinary": "Disciplinary Procedures",
};

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const title = pageTitles[location.pathname] || "Employee Manual";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="lg:pl-72">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          title={title}
        />
        <main className="p-4 lg:p-8 pb-16">
          <div className="mx-auto max-w-4xl animate-fade-in">
            <Outlet />
          </div>
        </main>
        <footer className="fixed bottom-0 right-0 left-0 lg:left-72 bg-background/80 backdrop-blur-sm border-t border-border px-4 py-2">
          <p className="text-center text-xs text-muted-foreground">
            Operational guidance only. Not legal advice.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
