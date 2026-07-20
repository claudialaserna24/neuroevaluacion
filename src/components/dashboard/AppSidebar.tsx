import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  User,
  ClipboardList,
  Compass,
  FileText,
  Bot,
  BookOpen,
  TrendingUp,
  UserRound,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/logo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  action?: "moholka";
  exact?: boolean;
};

const items: Item[] = [
  { label: "Inicio", icon: Home, to: "/app", exact: true },
  { label: "Ficha Integral", icon: User, to: "/app/ficha" },
  { label: "Evaluaciones", icon: ClipboardList, to: "/app/evaluaciones" },
  { label: "Hoja de Ruta", icon: Compass, to: "/app/hoja-de-ruta" },
  { label: "Plan Interactivo", icon: FileText, to: "/app/mi-plan" },
  { label: "Moholka", icon: Bot, action: "moholka" },
  { label: "Manual Oficial", icon: BookOpen, to: "/app/manual" },
  { label: "Seguimiento", icon: TrendingUp, to: "/app/seguimiento" },
  { label: "Mi Perfil", icon: UserRound, to: "/app/perfil" },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { setOpenMobile, isMobile } = useSidebar();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-4">
        <Link to="/app" onClick={closeOnMobile}>
          <Logo />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const Icon = it.icon;
                const active = it.to ? isActive(it.to, it.exact) : false;
                if (it.action === "moholka") {
                  return (
                    <SidebarMenuItem key={it.label}>
                      <SidebarMenuButton
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent("moholka:open"));
                          closeOnMobile();
                        }}
                        className="gap-3"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{it.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={it.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn("gap-3")}
                    >
                      <Link to={it.to!} onClick={closeOnMobile}>
                        <Icon className="h-4 w-4" />
                        <span>{it.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
              className="gap-3 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}