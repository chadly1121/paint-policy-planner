import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Index from "./pages/Index";
import SOPs from "./pages/SOPs";
import Safety from "./pages/Safety";
import Policies from "./pages/Policies";
import Training from "./pages/Training";
import Disciplinary from "./pages/Disciplinary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/sops" element={<SOPs />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/training" element={<Training />} />
            <Route path="/disciplinary" element={<Disciplinary />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
