"use client";

import { Fragment, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buscarDetalheSolicitacao } from "@/actions/solicitacoes";
import { DetailContent, type AnexoPorOrdem, type SolicitacaoDetalhada } from "./[id]/detail-content";
import type { SolicitacaoFlags } from "@/lib/solicitacoes/permissions";
import type { StatusSolicitacao } from "@/generated/prisma";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export type SolicitacaoRow = {
  id: string;
  numero: string;
  setorNome: string;
  requisitanteNome: string;
  finalidade: string;
  status: StatusSolicitacao;
  createdAt: Date;
};

type Detalhe = {
  solicitacao: SolicitacaoDetalhada;
  anexosPorOrdem: AnexoPorOrdem;
  flags: SolicitacaoFlags;
};

export function SolicitacoesTable({
  rows,
  mostrarRequisitante,
}: {
  rows: SolicitacaoRow[];
  mostrarRequisitante: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, Detalhe | "loading" | "error">>({});

  const colSpan = 5 + (mostrarRequisitante ? 1 : 0);

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
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Número</TableHead>
          <TableHead>Setor</TableHead>
          {mostrarRequisitante && <TableHead>Requisitante</TableHead>}
          <TableHead>Finalidade</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => {
          const isExpanded = expandedId === s.id;
          const detalhe = cache[s.id];

          return (
            <Fragment key={s.id}>
              <TableRow
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => toggle(s.id)}
              >
                <TableCell>
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell className="font-data font-medium">{s.numero}</TableCell>
                <TableCell>{s.setorNome}</TableCell>
                {mostrarRequisitante && <TableCell>{s.requisitanteNome}</TableCell>}
                <TableCell className="max-w-64 truncate">{s.finalidade}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {dateFmt.format(s.createdAt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow>
                  <TableCell colSpan={colSpan} className="bg-muted/20 p-0">
                    <div className="animate-fade-up p-4 md:p-6">
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
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
