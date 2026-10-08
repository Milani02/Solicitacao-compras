"use client";

import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  FileWarning,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { buscarDetalheSolicitacao } from "@/actions/solicitacoes";
import {
  DetailContent,
  type AnexoPorOrdem,
  type SolicitacaoDetalhada,
} from "../solicitacoes/[id]/detail-content";
import type { SolicitacaoFlags } from "@/lib/solicitacoes/permissions";
import { ControleComprasRowEditor } from "./row-editor";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export type ControleComprasRow = {
  id: string;
  numero: string;
  requisitanteNome: string;
  aprovadoEm: Date | null;
  fornecedorNome: string;
  produtos: string;
  notaFiscal: string;
  observacoes: string;
};

type Detalhe = {
  solicitacao: SolicitacaoDetalhada;
  anexosPorOrdem: AnexoPorOrdem;
  flags: SolicitacaoFlags;
};

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ControleComprasHistoryList({ rows }: { rows: ControleComprasRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, Detalhe | "loading" | "error">>({});

  async function toggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (cache[id]) return;

    setCache((c) => ({ ...c, [id]: "loading" }));
    const result = await buscarDetalheSolicitacao(id);
    if (result.error || !result.data) {
      setCache((c) => ({ ...c, [id]: "error" }));
      toast.error(result.error ?? "Não foi possível carregar os detalhes.");
      return;
    }
    setCache((c) => ({ ...c, [id]: result.data! }));
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const isExpanded = expandedId === row.id;
        const detalhe = cache[row.id];
        const temNotaFiscal = Boolean(row.notaFiscal);

        return (
          <Card
            key={row.id}
            className={cn(
              "overflow-hidden border-l-4 py-0",
              temNotaFiscal ? "border-l-emerald-500" : "border-l-amber-500"
            )}
          >
            <button
              type="button"
              onClick={() => toggle(row.id)}
              className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex shrink-0 items-center gap-3 sm:w-52">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 font-medium text-primary">
                    {initials(row.requisitanteNome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-data text-sm font-semibold">{row.numero}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.requisitanteNome}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400"
                >
                  <Building2 data-icon="inline-start" />
                  {row.fornecedorNome || "Sem fornecedor"}
                </Badge>
                <span className="min-w-0 truncate text-sm text-muted-foreground">
                  {row.produtos}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {row.aprovadoEm ? dateFmt.format(row.aprovadoEm) : ""}
                </span>
                {temNotaFiscal ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    <FileCheck2 data-icon="inline-start" />
                    NF ok
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                  >
                    <FileWarning data-icon="inline-start" />
                    NF pendente
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </div>
            </button>

            <div className="flex flex-wrap items-end gap-3 border-t bg-muted/20 px-4 py-3">
              <ControleComprasRowEditor
                id={row.id}
                notaFiscal={row.notaFiscal}
                observacoes={row.observacoes}
              />
            </div>

            {isExpanded && (
              <div className="animate-fade-up border-t bg-muted/10 p-4 md:p-6">
                {detalhe === "loading" && <Skeleton className="h-40 w-full" />}
                {detalhe === "error" && (
                  <p className="text-sm text-destructive">
                    Não foi possível carregar os detalhes desta solicitação.
                  </p>
                )}
                {detalhe && typeof detalhe === "object" && (
                  <DetailContent
                    solicitacao={detalhe.solicitacao}
                    flags={detalhe.flags}
                    anexosPorOrdem={detalhe.anexosPorOrdem}
                  />
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
