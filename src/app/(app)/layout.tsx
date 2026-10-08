import { LogOut } from "lucide-react";
import { requireProfile } from "@/lib/auth/dal";
import { logout } from "@/actions/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();

  return (
    <SidebarProvider>
      <AppSidebar
        profile={{
          nome: profile.nome,
          email: profile.email,
          role: profile.role,
          controleCompras: profile.controleCompras,
        }}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-1 h-4" />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Sair da conta">
                <LogOut />
              </Button>
            </form>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
