import {
  LayoutDashboard,
  Users,
  GraduationCap,
  DollarSign,
  Settings,
  TrendingUp,
  Monitor,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const menuItems = [
  {
    title: "Ana Sayfa",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Öğrenciler",
    url: "/students",
    icon: GraduationCap,
  },
  {
    title: "Koçlar",
    url: "/coaches",
    icon: Users,
  },
  {
    title: "Ödemeler",
    url: "/payments",
    icon: DollarSign,
  },
  {
    title: "Finansallar",
    url: "/financials",
    icon: TrendingUp,
  },
  {
    title: "Ayarlar",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="p-6 border-b border-border/30">
        <div className="flex items-center gap-3 animate-in fade-in duration-700">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_0_15px_hsl(var(--primary)/0.5)]">
            <div className="bg-background/20 p-1.5 rounded-lg backdrop-blur-sm">
              <Monitor className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tight">
              MedKampüs
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-primary font-semibold opacity-90">
              Yönetim Paneli
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest px-4 mb-2">
            Menü
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.url === "/" ? "dashboard" : item.url.substring(1)}`}
                      className={`
                        w-full justify-start gap-3 px-4 py-6 rounded-xl transition-all duration-300
                        ${isActive
                          ? 'bg-primary/20 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.2)] border border-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                        <span className="font-medium tracking-wide">{item.title}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
