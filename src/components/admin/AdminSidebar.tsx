import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ClipboardList, Shield, User } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/logo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/admin/overview.functions";
export function AdminSidebar() {
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const fn = useServerFn(getMyRole);
  const role = useQuery({ queryKey: ["my-role"], queryFn: () => fn(), staleTime: 300000 });
  const close = () => setOpenMobile(false);
  return <Sidebar collapsible="offcanvas"><SidebarHeader className="p-4"><Logo /></SidebarHeader><SidebarContent><SidebarMenu className="p-3">
    <SidebarMenuItem><SidebarMenuButton asChild><Link to="/app/admin" onClick={close}><ClipboardList />Usuarios registrados</Link></SidebarMenuButton></SidebarMenuItem>
    
    {role.data?.isAdmin && <SidebarMenuItem><SidebarMenuButton asChild><Link to="/app/admin" onClick={close}><Shield />Administración</Link></SidebarMenuButton></SidebarMenuItem>}
  </SidebarMenu></SidebarContent><SidebarFooter><SidebarMenuButton onClick={async () => { await supabase.auth.signOut(); await navigate({ to: "/auth", search: {}, replace: true }); }}><LogOut />Cerrar sesión</SidebarMenuButton></SidebarFooter></Sidebar>;
}
