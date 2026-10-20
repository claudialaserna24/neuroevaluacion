import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Logo } from "@/components/brand/logo";
import { getMyRole } from "@/lib/admin/overview.functions";

export const Route = createFileRoute("/_authenticated/app/admin")({
  head: () => ({
    meta: [
      { title: "Panel administrador — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const role = await getMyRole();
    if (!role.isAdmin) throw redirect({ to: "/app" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
            <SidebarTrigger />
            <div className="md:hidden">
              <Logo />
            </div>
            <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
              CRM NEUROPLAN
            </span>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}