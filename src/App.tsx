import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import MainLayout from "./components/layout/MainLayout";
import Index from "./pages/Index";
import SOPs from "./pages/SOPs";
import Safety from "./pages/Safety";
import SDS from "./pages/SDS";
import Policies from "./pages/Policies";
import Training from "./pages/Training";
import Disciplinary from "./pages/Disciplinary";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ComplianceGuidance from "./pages/ComplianceGuidance";
import Pricing from "./pages/Pricing";
import DocumentBuilder from "./pages/DocumentBuilder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/compliance-guidance" element={<ComplianceGuidance />} />
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/sops" element={<SOPs />} />
              <Route path="/safety" element={<Safety />} />
              <Route path="/sds" element={<SDS />} />
              <Route path="/policies" element={<Policies />} />
              <Route path="/training" element={<Training />} />
              <Route path="/disciplinary" element={<Disciplinary />} />
              <Route path="/builder" element={<DocumentBuilder />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
