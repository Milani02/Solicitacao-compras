import { formatCentavos, formatCentavosPorUnidade } from "@/lib/format";
import { AnexosThumbnails } from "./anexos-thumbnails";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ApprovalActions } from "./approval-actions";
import { RequestActions } from "./request-actions";
import { Timeline } from "./timeline";
import type { SolicitacaoFlags } from "@/lib/solicitacoes/permissions";
import type { StatusSolicitacao } from "@/generated/prisma";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export type AnexoPorOrdem = Record<
  number,
  { id: string; url: string; nomeArquivo: string }[]
>;

export type SolicitacaoDetalhada = {
  id: string;
  status: StatusSolicitacao;
  requisitante: { nome: string };
  createdAt: Date;
  finalidade: string;
  justificativa: string;
  motivoReprovacao: string | null;
  fornecedorAprovadoId: string | null;
  itens: {
    id: string;
    codigo: string | null;
    quantidade: number;
    unidade: string;
    especificacao: string;
  }[];
  fornecedores: {
    id: string;
    ordem: number;
    nome: string;
    telefone: string | null;
    contato: string | null;
    cotacoes: { itemId: string; valorCentavos: number }[];
  }[];
  historico: {
    id: string;
    statusNovo: StatusSolicitacao;
    comentario: string | null;
    createdAt: Date;
    usuario: { nome: string } | null;
  }[];
};

/** Bloco de detalhe completo de uma solicitação — Dados, Itens, Valores por
 * item, Cotações, Ações e Timeline. Usado tanto pela página standalone
 * (/solicitacoes/[id], linkada de e-mail/Discord) quanto pelo expand inline
 * nas listas de Solicitações e Controle de Compras — uma única fonte de
 * verdade pra essa marcação. */
export function DetailContent({
  solicitacao,
  flags,
  anexosPorOrdem,
}: {
  solicitacao: SolicitacaoDetalhada;
  flags: SolicitacaoFlags;
  anexosPorOrdem: AnexoPorOrdem;
}) {
  const fornecedoresComTotal = solicitacao.fornecedores.map((f) => ({
    id: f.id,
    nome: f.nome,
    telefone: f.telefone,
    contato: f.contato,
    totalCentavos: f.cotacoes.reduce((sum, c) => sum + c.valorCentavos, 0),
    valoresPorItem: Object.fromEntries(f.cotacoes.map((c) => [c.itemId, c.valorCentavos])),
    fotos: anexosPorOrdem[f.ordem] ?? [],
  }));

  const mostrarComparativoCotacoes = solicitacao.fornecedores.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {flags.podeCancelar && (
        <div className="flex justify-end">
          <RequestActions solicitacaoId={solicitacao.id} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados da solicitação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Requisitante</p>
            <p className="font-medium">{solicitacao.requisitante.nome}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Data</p>
            <p className="font-medium">{dateTimeFmt.format(solicitacao.createdAt)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Finalidade</p>
            <p className="font-medium">{solicitacao.finalidade}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Justificativa</p>
            <p className="font-medium">{solicitacao.justificativa}</p>
          </div>
          {solicitacao.motivoReprovacao && (
            <div className="sm:col-span-2">
              <p className="text-destructive">Motivo da reprovação</p>
              <p className="font-medium">{solicitacao.motivoReprovacao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
          <CardDescription>{solicitacao.itens.length} item(ns)</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead>Especificação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitacao.itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-data text-muted-foreground">
                    {item.codigo || "—"}
                  </TableCell>
                  <TableCell className="font-data">{item.quantidade}</TableCell>
                  <TableCell className="font-data">{item.unidade}</TableCell>
                  <TableCell>{item.especificacao}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {mostrarComparativoCotacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Valores por item</CardTitle>
            <CardDescription>Total e valor por unidade cotados em cada fornecedor</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  {fornecedoresComTotal.map((f) => (
                    <TableHead key={f.id} className="text-right">
                      {f.nome}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacao.itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {item.quantidade} {item.unidade} — {item.especificacao}
                    </TableCell>
                    {fornecedoresComTotal.map((f) => {
                      const valorCentavos = f.valoresPorItem[item.id];
                      return (
                        <TableCell key={f.id} className="text-right">
                          {valorCentavos !== undefined ? (
                            <div className="flex flex-col">
                              <span className="font-data">{formatCentavos(valorCentavos)}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatCentavosPorUnidade(valorCentavos, item.quantidade)}/un.
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {mostrarComparativoCotacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Cotações</CardTitle>
            <CardDescription>Comparativo de fornecedores</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Prints</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedoresComTotal.map((f) => (
                  <TableRow
                    key={f.id}
                    className={
                      f.id === solicitacao.fornecedorAprovadoId
                        ? "bg-primary/5"
                        : undefined
                    }
                  >
                    <TableCell className="font-medium">
                      {f.nome}
                      {f.id === solicitacao.fornecedorAprovadoId && (
                        <span className="ml-2 text-xs font-normal text-primary">
                          Fornecedor aprovado
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.contato || "—"} {f.telefone ? `· ${f.telefone}` : ""}
                    </TableCell>
                    <TableCell>
                      <AnexosThumbnails anexos={f.fotos} />
                    </TableCell>
                    <TableCell className="font-data text-right">
                      {formatCentavos(f.totalCentavos)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {flags.podeAprovar && (
        <ApprovalActions solicitacaoId={solicitacao.id} fornecedores={fornecedoresComTotal} />
      )}

      {flags.podeConcluir && <RequestActions solicitacaoId={solicitacao.id} concluir />}

      <Separator />

      <Timeline
        historico={solicitacao.historico.map((h) => ({
          id: h.id,
          statusNovo: h.statusNovo,
          comentario: h.comentario,
          createdAt: h.createdAt,
          usuarioNome: h.usuario?.nome ?? null,
        }))}
      />
    </div>
  );
}
