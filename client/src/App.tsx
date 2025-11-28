import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
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
import LockScreen from "@/pages/LockScreen"; // Pages içine eklediğin için

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/students" component={Students} />
      <Route path="/coaches" component={Coaches} />
      <Route path="/payments" component={Payments} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  // --- KİLİT EKRANI MANTIĞI BAŞLANGIÇ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Sayfa yüklenince tarayıcı hafızasına bak
    const auth = localStorage.getItem("medkampus_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Eğer giriş yapılmadıysa, SADECE Kilit Ekranını göster
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
