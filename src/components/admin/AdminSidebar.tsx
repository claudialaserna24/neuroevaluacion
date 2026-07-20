import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Baby,
  ClipboardList,
  Compass,
  FileText,
  Bot,
  Brain,
  CreditCard,
  Stethoscope,
  UserCog,
  Settings,
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
  to: string;
  exact?: boolean;
};

const items: Item[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/app/admin", exact: true },
  { label: "Familias", icon: Users, to: "/app/admin/familias" },
  { label: "Pacientes", icon: Baby, to: "/app/admin/pacientes" },
  { label: "Evaluaciones", icon: ClipboardList, to: "/app/admin/evaluaciones" },
  { label: "Hojas de Ruta", icon: Compass, to: "/app/admin/hojas-de-ruta" },
  { label: "Planes Interactivos", icon: FileText, to: "/app/admin/planes" },
  { label: "Moholka", icon: Bot, to: "/app/admin/moholka" },
  { label: "CEREBRO", icon: Brain, to: "/app/admin/cerebro" },
  { label: "Pagos", icon: CreditCard, to: "/app/admin/pagos" },
  {
    label: "Neuropsicólogos",
    icon: Stethoscope,
    to: "/app/admin/neuropsicologos",
  },
  { label: "Usuarios", icon: UserCog, to: "/app/admin/usuarios" },
  { label: "Configuración", icon: Settings, to: "/app/admin/configuracion" },
];

export function AdminSidebar() {
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
        <Link to="/app/admin" onClick={closeOnMobile}>
          <div className="flex items-center gap-2">
            <Logo />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Admin
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const Icon = it.icon;
                const active = isActive(it.to, it.exact);
                return (
                  <SidebarMenuItem key={it.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn("gap-3")}
                    >
                      <Link to={it.to} onClick={closeOnMobile}>
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
            <SidebarMenuButton asChild className="gap-3 text-muted-foreground">
              <Link to="/app" onClick={closeOnMobile}>
                <LayoutDashboard className="h-4 w-4" />
                <span>Volver al Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
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