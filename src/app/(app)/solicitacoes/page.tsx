import Link from "next/link";
import { Plus, ClipboardList, Clock, CheckCircle2, XCircle } from "lucide-react";
import { requireProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { WetPaintLinkButton } from "@/components/wet-paint-button";
import { Card, CardContent } from "@/components/ui/card";
import { FiltersBar } from "./filters-bar";
import { SolicitacoesTable } from "./table";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyContent,
} from "@/components/ui/empty";
import type { Prisma, StatusSolicitacao } from "@/generated/prisma";
import {
  parseSolicitacoesFilters,
  buildSolicitacoesWhere,
  type SolicitacoesFilterInput,
} from "@/lib/solicitacoes/filters";

function hrefParaStatus(filters: SolicitacoesFilterInput, status: string | null) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (filters.setorId) params.set("setorId", filters.setorId);
  if (filters.de) params.set("de", filters.de);
  if (filters.ate) params.set("ate", filters.ate);
  const qs = params.toString();
  return `/solicitacoes${qs ? `?${qs}` : ""}`;
}

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile();
  const filters = parseSolicitacoesFilters(await searchParams);

  const hasFilters = Boolean(filters.status || filters.setorId || filters.de || filters.ate);

  const scope: Prisma.SolicitacaoCompraWhereInput =
    profile.role === "GESTOR" ? { requisitanteId: profile.id } : {};
  const where = buildSolicitacoesWhere(scope, filters);
  // Os cards de KPI precisam continuar mostrando a contagem de todos os
  // status (só respeitando setor/data) — senão, ao clicar num card e
  // filtrar por status, os outros cards zerariam porque a query de
  // contagem já estaria restrita ao status escolhido.
  const whereSemStatus = buildSolicitacoesWhere(scope, { ...filters, status: undefined });

  const [solicitacoes, setores, statusCounts] = await Promise.all([
    prisma.solicitacaoCompra.findMany({
      where,
      include: { setor: true, requisitante: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    profile.role === "GESTOR"
      ? Promise.resolve([])
      : prisma.setor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.solicitacaoCompra.groupBy({
      by: ["status"],
      where: whereSemStatus,
      _count: { _all: true },
    }),
  ]);

  const countFor = (statuses: StatusSolicitacao[]) =>
    statusCounts
      .filter((c) => statuses.includes(c.status))
      .reduce((sum, c) => sum + c._count._all, 0);

  const total = statusCounts.reduce((sum, c) => sum + c._count._all, 0);
  const aguardando = countFor(["AGUARDANDO_APROVACAO", "AGUARDANDO_APROVACAO_FINAL"]);
  const aprovadas = countFor(["APROVADA"]);
  const reprovadas = countFor(["REPROVADA"]);

  const kpis = [
    {
      label: "Total",
      value: total,
      icon: ClipboardList,
      accent: "border-l-primary",
      chip: "bg-primary/10 text-primary",
      valueClass: "text-primary",
      statusValue: null,
    },
    {
      label: "Aguardando aprovação",
      value: aguardando,
      icon: Clock,
      accent: "border-l-amber-500",
      chip: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      valueClass: "text-amber-600 dark:text-amber-400",
      statusValue: "AGUARDANDO_APROVACAO,AGUARDANDO_APROVACAO_FINAL",
    },
    {
      label: "Aprovadas",
      value: aprovadas,
      icon: CheckCircle2,
      accent: "border-l-emerald-500",
      chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      valueClass: "text-emerald-600 dark:text-emerald-400",
      statusValue: "APROVADA",
    },
    {
      label: "Reprovadas",
      value: reprovadas,
      icon: XCircle,
      accent: "border-l-red-500",
      chip: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      valueClass: "text-red-600 dark:text-red-400",
      statusValue: "REPROVADA",
    },
  ] as const;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {profile.role === "GESTOR" ? "Minhas solicitações" : "Solicitações"}
          </h1>
          <p className="text-sm text-muted-foreground">Visão geral e histórico completo</p>
        </div>
        {profile.role === "GESTOR" && (
          <WetPaintLinkButton href="/solicitacoes/nova">
            <Plus className="size-4" />
            Nova solicitação
          </WetPaintLinkButton>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const isActive = kpi.statusValue
            ? filters.status === kpi.statusValue
            : !filters.status;

          return (
            <Link key={kpi.label} href={hrefParaStatus(filters, kpi.statusValue)}>
              <Card
                className={cn(
                  "border-l-4 transition-shadow hover:shadow-md",
                  kpi.accent,
                  isActive && "ring-2 ring-primary/40"
                )}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{kpi.label}</span>
                    <span
                      className={`flex size-8 items-center justify-center rounded-full ${kpi.chip}`}
                    >
                      <kpi.icon className="size-4" />
                    </span>
                  </div>
                  <span
                    className={`font-data text-3xl font-semibold tabular-nums ${kpi.valueClass}`}
                  >
                    {kpi.value}
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <FiltersBar setores={setores} />

      {solicitacoes.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>Nenhuma solicitação encontrada</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Nenhuma solicitação corresponde aos filtros selecionados."
                : profile.role === "GESTOR"
                  ? "Crie sua primeira solicitação de compra."
                  : "Nenhuma solicitação foi enviada até o momento."}
            </EmptyDescription>
          </EmptyHeader>
          {!hasFilters && profile.role === "GESTOR" && (
            <EmptyContent>
              <WetPaintLinkButton href="/solicitacoes/nova">
                <Plus className="size-4" />
                Criar solicitação
              </WetPaintLinkButton>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="max-h-[65vh] overflow-y-auto rounded-lg border">
          <SolicitacoesTable
            rows={solicitacoes.map((s) => ({
              id: s.id,
              numero: s.numero,
              setorNome: s.setor.nome,
              requisitanteNome: s.requisitante.nome,
              finalidade: s.finalidade,
              status: s.status,
              createdAt: s.createdAt,
            }))}
            mostrarRequisitante={profile.role !== "GESTOR"}
          />
        </div>
      )}
    </div>
  );
}
