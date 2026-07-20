import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Logo } from "@/components/brand/logo";
import { getFamilyDashboard } from "@/lib/dashboard.functions";
import { MoholkaFloatingButton } from "@/components/plan/MoholkaFloatingButton";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Admin subtree uses its own layout (AdminSidebar); skip the family shell.
  if (pathname === "/app/admin" || pathname.startsWith("/app/admin/")) {
    return <Outlet />;
  }

  const fetchDashboard = useServerFn(getFamilyDashboard);
  const dashboard = useQuery({
    queryKey: ["family-dashboard"],
    queryFn: () => fetchDashboard(),
    staleTime: 30_000,
  });

  const patientId = dashboard.data?.patient?.id ?? null;
  const planReady = dashboard.data?.plan.status === "ready";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
            <SidebarTrigger />
            <div className="md:hidden">
              <Logo />
            </div>
          </header>
          <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      {planReady && patientId ? (
        <MoholkaFloatingButton ready patientId={patientId} hideTrigger />
      ) : null}
    </SidebarProvider>
  );
}