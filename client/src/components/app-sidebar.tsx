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
    <Sidebar className="border-r-0 bg-transparent py-4 pl-4">
      {/* Floating Glass Pillar */}
      <div className="h-full w-full rounded-[24px] glass-card flex flex-col">
        <SidebarHeader className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 animate-in fade-in duration-700">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight text-glow-white">
                MedKampüs
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-medium opacity-80">
                Yönetim Paneli
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-6">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest px-4 mb-4">
              Navigasyon
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`nav-${item.url === "/" ? "dashboard" : item.url.substring(1)}`}
                        className={`
                          w-full justify-start gap-4 px-4 py-6 rounded-xl transition-all duration-300 group relative overflow-hidden
                          ${isActive
                            ? 'bg-gradient-to-r from-emerald-500/20 to-transparent text-white border-l-4 border-emerald-500 shadow-[0_4px_20px_-5px_rgba(16,185,129,0.3)]'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'}
                        `}
                      >
                        <Link href={item.url} className="flex items-center gap-4 relative z-10">
                          <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'group-hover:scale-105'}`} />
                          <span className={`font-medium tracking-wide ${isActive ? 'text-white' : ''}`}>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
