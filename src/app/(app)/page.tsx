import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { requireProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { CountUp } from "@/components/count-up";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WetPaintLinkButton } from "@/components/wet-paint-button";
import { StatusBadge } from "@/components/status-badge";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DashboardPage() {
  const profile = await requireProfile();

  // Contas que só existem pra controle de compras (gestor sem setor real,
  // só com a permissão) não têm o que fazer no painel geral — manda direto
  // pra tela que elas realmente usam.
  if (profile.role === "GESTOR" && profile.controleCompras) {
    redirect("/controle-compras");
  }

  const scope: Prisma.SolicitacaoCompraWhereInput =
    profile.role === "GESTOR" ? { requisitanteId: profile.id } : {};

  const [total, pendentes, reprovadas, aprovadas, recentes, topCentrosRaw] = await Promise.all([
    prisma.solicitacaoCompra.count({ where: scope }),
    prisma.solicitacaoCompra.count({
      where: {
        ...scope,
        status: { in: ["AGUARDANDO_APROVACAO", "AGUARDANDO_APROVACAO_FINAL"] },
      },
    }),
    prisma.solicitacaoCompra.count({ where: { ...scope, status: "REPROVADA" } }),
    prisma.solicitacaoCompra.count({ where: { ...scope, status: "APROVADA" } }),
    prisma.solicitacaoCompra.findMany({
      where: scope,
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, numero: true, finalidade: true, status: true, updatedAt: true },
    }),
    prisma.solicitacaoCompra.groupBy({
      by: ["centroCustoId"],
      where: scope,
      _count: { centroCustoId: true },
      orderBy: { _count: { centroCustoId: "desc" } },
      take: 4,
    }),
  ]);

  const centros = await prisma.centroCusto.findMany({
    where: { id: { in: topCentrosRaw.map((c) => c.centroCustoId) } },
    select: { id: true, codigo: true, descricao: true },
  });
  const centroMap = new Map(centros.map((c) => [c.id, c]));
  const topCentros = topCentrosRaw
    .map((c) => ({ centro: centroMap.get(c.centroCustoId), count: c._count.centroCustoId }))
    .filter((c): c is { centro: NonNullable<typeof c.centro>; count: number } => !!c.centro);

  const secondaryStats = [
    {
      label: profile.role === "GESTOR" ? "Minhas solicitações" : "Solicitações",
      value: total,
      icon: ClipboardList,
    },
    { label: "Reprovadas", value: reprovadas, icon: XCircle },
    { label: "Aprovadas", value: aprovadas, icon: CheckCircle2 },
  ];

  const statusBreakdown = [
    { label: "Aguardando aprovação", value: pendentes },
    { label: "Reprovadas", value: reprovadas },
    { label: "Aprovadas", value: aprovadas },
  ];

  const heroLabel =
    profile.role === "DIRETORIA" ? "Aguardando sua aprovação" : "Aguardando aprovação";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Olá, {profile.nome.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile.setor ? `${profile.setor.nome} · ` : ""}
            Visão geral das solicitações de compra
          </p>
        </div>
        {profile.role === "GESTOR" && (
          <WetPaintLinkButton href="/solicitacoes/nova">
            <Plus className="size-4" />
            Nova solicitação
          </WetPaintLinkButton>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link
          href="/solicitacoes"
          className="animate-fade-up group relative flex flex-col justify-between overflow-hidden rounded-xl bg-brand-gradient p-6 text-white lg:col-span-1"
        >
          <div
            aria-hidden
            className="absolute -top-10 -right-10 size-40 rounded-full bg-brand-gold/25 blur-[64px] transition-opacity duration-300 group-hover:opacity-80"
          />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <span className="text-sm text-white/70">{heroLabel}</span>
            <Clock className="size-5 text-brand-gold" />
          </div>
          <div className="relative z-10 mt-6 flex items-end justify-between">
            <span className="font-data text-5xl font-semibold tabular-nums">
              <CountUp value={pendentes} />
            </span>
            <span className="mb-1 flex items-center gap-1 text-xs text-white/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Ver todas
              <ArrowRight className="size-3.5" />
            </span>
          </div>
        </Link>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2">
          {secondaryStats.map((stat, i) => (
            <Card
              key={stat.label}
              className="animate-fade-up"
              style={{ animationDelay: `${80 + i * 70}ms` }}
            >
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className="size-4 text-muted-foreground" />
                </div>
                <span className="font-data text-3xl font-semibold tabular-nums">
                  <CountUp value={stat.value} />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <Empty className="animate-fade-up border border-dashed" style={{ animationDelay: "260ms" }}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>Nenhuma solicitação ainda</EmptyTitle>
            <EmptyDescription>
              {profile.role === "GESTOR"
                ? "Quando você criar uma solicitação de compra, ela vai aparecer aqui com todo o histórico de aprovação."
                : "Assim que os gestores enviarem solicitações, elas vão aparecer aqui para acompanhamento e aprovação."}
            </EmptyDescription>
          </EmptyHeader>
          {profile.role === "GESTOR" && (
            <EmptyContent>
              <WetPaintLinkButton href="/solicitacoes/nova">
                <Plus className="size-4" />
                Criar primeira solicitação
              </WetPaintLinkButton>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Solicitações recentes</CardTitle>
              <Link
                href="/solicitacoes"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver todas
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {recentes.map((s) => (
                <Link
                  key={s.id}
                  href={`/solicitacoes/${s.id}`}
                  className="flex items-center gap-4 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-data text-sm font-medium">{s.numero}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {s.finalidade}
                    </span>
                  </div>
                  <StatusBadge status={s.status} />
                  <span className="w-32 shrink-0 text-right text-xs text-muted-foreground">
                    {dateTimeFmt.format(s.updatedAt)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Status das solicitações</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {statusBreakdown.map((s) => (
                  <Progress key={s.label} value={total > 0 ? (s.value / total) * 100 : 0}>
                    <div className="flex w-full justify-between">
                      <ProgressLabel>{s.label}</ProgressLabel>
                      <span className="text-sm text-muted-foreground tabular-nums">{s.value}</span>
                    </div>
                  </Progress>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Centros de custo mais usados</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {topCentros.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>
                ) : (
                  topCentros.map(({ centro, count }) => (
                    <div key={centro.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Wallet className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">
                          {centro.codigo} · {centro.descricao}
                        </span>
                      </div>
                      <span className="font-data shrink-0 text-sm text-muted-foreground">
                        {count}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
