import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// Sayfalar
import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import Coaches from "@/pages/coaches";
import Payments from "@/pages/payments";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import LockScreen from "@/pages/LockScreen";
import Financials from "@/pages/financials";
import Packages from "@/pages/packages";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/students" component={Students} />
      <Route path="/coaches" component={Coaches} />
      <Route path="/payments" component={Payments} />
      <Route path="/financials" component={Financials} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [location] = useLocation();

  // --- KİLİT EKRANI MANTIĞI BAŞLANGIÇ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Sayfa yüklenince tarayıcı hafızasına bak
    const auth = localStorage.getItem("medkampus_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Special Route for Packages (Full Screen, No Sidebar) - PUBLIC ACCESS
  if (location === "/paketler") {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Packages />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Eğer giriş yapılmadıysa, SADECE Kilit Ekranını göster
  // Not: Paketler sayfasına herkesin girmesini istiyorsak buradaki check'i ona göre ayarlamalıyız.
  // Kullanıcı "medkampus-designboard2 projemizde" dediği için muhtemelen auth gerekli.
  // Ama URL paylaşımı yapılacaksa belki public olmalı? 
  // Güvenli taraf: Auth gerekli olsun. 
  if (!isAuthenticated) {
    return <LockScreen onUnlock={() => setIsAuthenticated(true)} />;
  }
  // --- KİLİT EKRANI MANTIĞI BİTİŞ ---

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <header className="flex items-center h-16 px-6 border-b border-border bg-background sticky top-0 z-50">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
              </header>
              <main className="flex-1 overflow-auto p-6 bg-background">
                <div className="max-w-7xl mx-auto">
                  <Router />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
