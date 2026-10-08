import Link from "next/link";
import { ClipboardCheck, FileWarning, Wallet } from "lucide-react";
import { requireControleCompras } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCentavos } from "@/lib/format";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ControleComprasHistoryList } from "./history-list";
import { ControleComprasFiltersBar } from "./filters-bar";
import {
  parseControleComprasFilters,
  buildControleComprasWhere,
  type ControleComprasFilterInput,
} from "@/lib/controle-compras/filters";

function hrefParaNf(filters: ControleComprasFilterInput, nf: string | null) {
  const params = new URLSearchParams();
  if (nf) params.set("nf", nf);
  if (filters.de) params.set("de", filters.de);
  if (filters.ate) params.set("ate", filters.ate);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return `/controle-compras${qs ? `?${qs}` : ""}`;
}

export default async function ControleComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireControleCompras();
  const filters = parseControleComprasFilters(await searchParams);
  const hasFilters = Boolean(filters.de || filters.ate || filters.nf || filters.q);

  const where = buildControleComprasWhere(filters);
  // Os cards de "Aprovadas"/"Aguardando nota fiscal" precisam continuar
  // mostrando a contagem das duas situações mesmo quando um filtro de nota
  // fiscal já está aplicado — senão, ao clicar num card, o outro zeraria.
  const whereSemNf = buildControleComprasWhere({ ...filters, nf: undefined });

  const [solicitacoes, totalSemNf, aguardandoNotaFiscal] = await Promise.all([
    prisma.solicitacaoCompra.findMany({
      where,
      include: {
        requisitante: true,
        fornecedorAprovado: true,
        fornecedores: { include: { cotacoes: true } },
        itens: { orderBy: { ordem: "asc" } },
      },
      orderBy: { aprovadoEm: "desc" },
    }),
    prisma.solicitacaoCompra.count({ where: whereSemNf }),
    prisma.solicitacaoCompra.count({ where: { ...whereSemNf, notaFiscal: null } }),
  ]);

  const comTotal = solicitacoes.map((s) => {
    const totalCentavos = s.fornecedorAprovado
      ? (s.fornecedores.find((f) => f.id === s.fornecedorAprovadoId)?.cotacoes.reduce(
          (sum, c) => sum + c.valorCentavos,
          0
        ) ?? 0)
      : 0;
    return { ...s, totalCentavos };
  });

  const valorTotalCentavos = comTotal.reduce((sum, s) => sum + s.totalCentavos, 0);

  const kpis = [
    {
      label: "Aprovadas",
      value: String(totalSemNf),
      icon: ClipboardCheck,
      accent: "border-l-emerald-500",
      chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      valueClass: "text-emerald-600 dark:text-emerald-400",
      nfValue: null,
    },
    {
      label: "Aguardando nota fiscal",
      value: String(aguardandoNotaFiscal),
      icon: FileWarning,
      accent: "border-l-amber-500",
      chip: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      valueClass: "text-amber-600 dark:text-amber-400",
      nfValue: "pendente",
    },
  ] as const;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Controle de Compras
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento das solicitações aprovadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => {
          const isActive = kpi.nfValue ? filters.nf === kpi.nfValue : !filters.nf;
          return (
            <Link key={kpi.label} href={hrefParaNf(filters, kpi.nfValue)}>
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

        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor total aprovado</span>
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Wallet className="size-4" />
              </span>
            </div>
            <span className="font-data text-3xl font-semibold tabular-nums text-primary">
              {formatCentavos(valorTotalCentavos)}
            </span>
          </CardContent>
        </Card>
      </div>

      <ControleComprasFiltersBar />

      {solicitacoes.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck />
            </EmptyMedia>
            <EmptyTitle>Nenhuma solicitação encontrada</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Nenhuma solicitação aprovada corresponde aos filtros selecionados."
                : "Assim que a Diretoria aprovar uma solicitação, ela aparece aqui."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ControleComprasHistoryList
          rows={comTotal.map((s) => ({
            id: s.id,
            numero: s.numero,
            requisitanteNome: s.requisitante.nome,
            aprovadoEm: s.aprovadoEm,
            fornecedorNome: s.fornecedorAprovado?.nome ?? "",
            produtos: s.itens
              .map((item) => `${item.quantidade} ${item.unidade} — ${item.especificacao}`)
              .join("; "),
            notaFiscal: s.notaFiscal ?? "",
            observacoes: s.observacoes ?? "",
          }))}
        />
      )}
    </div>
  );
}
