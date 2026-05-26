import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        />
        <main className="p-4 lg:p-8 pb-16">
          <div className="mx-auto max-w-4xl animate-fade-in">
            <Outlet />
          </div>
        </main>
        <footer className="fixed bottom-0 right-0 left-0 lg:left-72 bg-background/80 backdrop-blur-sm border-t border-border px-4 py-2">
          <p className="text-center text-xs text-muted-foreground">
            Training tools &amp; tracking. You control content. Compliance is your responsibility.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
