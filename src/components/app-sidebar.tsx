"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  FilePlus2,
  Users,
  Building2,
  ClipboardCheck,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";
import { logout } from "@/actions/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/generated/prisma";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  GESTOR: [
    { title: "Painel", url: "/", icon: LayoutDashboard },
    { title: "Minhas Solicitações", url: "/solicitacoes", icon: ShoppingCart },
    { title: "Nova Solicitação", url: "/solicitacoes/nova", icon: FilePlus2 },
  ],
  DIRETORIA: [
    { title: "Painel", url: "/", icon: LayoutDashboard },
    { title: "Solicitações", url: "/solicitacoes", icon: ShoppingCart },
  ],
  ADMIN: [
    { title: "Painel", url: "/", icon: LayoutDashboard },
    { title: "Solicitações", url: "/solicitacoes", icon: ShoppingCart },
  ],
};

const ADMIN_NAV: NavItem[] = [
  { title: "Usuários", url: "/admin/usuarios", icon: Users },
  { title: "Setores", url: "/admin/setores", icon: Building2 },
];

const CONTROLE_COMPRAS_NAV: NavItem[] = [
  { title: "Controle de Compras", url: "/controle-compras", icon: ClipboardCheck },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const ROLE_LABEL: Record<Role, string> = {
  GESTOR: "Gestor de setor",
  DIRETORIA: "Diretoria",
  ADMIN: "Administrador (TI)",
};

export function AppSidebar({
  profile,
}: {
  profile: { nome: string; email: string; role: Role; controleCompras: boolean };
}) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[profile.role];
  // Conta "pura" de Controle de Compras (gestor sem setor, só com a
  // permissão) não usa nenhum item do menu Geral — some com o grupo pra não
  // mostrar links que sempre vão dar em nada pra essa pessoa.
  const somenteControleCompras = profile.role === "GESTOR" && profile.controleCompras;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-auto" render={<Link href="/" />}>
              <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:flex hidden">
                <span className="font-data text-base font-semibold">B</span>
              </div>
              <div className="flex flex-1 flex-col gap-1 py-1 group-data-[collapsible=icon]:hidden">
                <Image
                  src="/logo-biodinamica-branca.png"
                  alt="Biodinâmica"
                  width={140}
                  height={56}
                  className="h-9 w-auto object-contain object-left"
                  priority
                />
                <span className="truncate text-xs text-sidebar-foreground/60">
                  Solicitação de Compras
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {!somenteControleCompras && (
          <SidebarGroup>
            <SidebarGroupLabel>Geral</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const isActive =
                    item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {profile.role === "ADMIN" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_NAV.map((item) => {
                  const isActive = pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {profile.controleCompras && (
          <SidebarGroup>
            <SidebarGroupLabel>Controle de Compras</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {CONTROLE_COMPRAS_NAV.map((item) => {
                  const isActive = pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {initials(profile.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{profile.nome}</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {ROLE_LABEL[profile.role]}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="top"
                align="end"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-0.5 text-left text-sm">
                      <span className="font-medium">{profile.nome}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {profile.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="size-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
