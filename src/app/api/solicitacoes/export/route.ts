import ExcelJS from "exceljs";
import { requireProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL } from "@/lib/solicitacoes/status";
import {
  parseSolicitacoesFilters,
  buildSolicitacoesWhere,
  type SolicitacoesFilterInput,
} from "@/lib/solicitacoes/filters";
import { criarPlanilha, dataExcel, respostaExcel } from "@/lib/excel/planilha";
import type { Prisma, StatusSolicitacao } from "@/generated/prisma";

function dataBr(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function descreverFiltros(
  f: SolicitacoesFilterInput,
  escopo: string,
  setorNome: string | null
) {
  const partes = [escopo];
  const status = (f.status ?? "")
    .split(",")
    .filter((s): s is StatusSolicitacao => s in STATUS_LABEL)
    .map((s) => STATUS_LABEL[s].toLowerCase());
  partes.push(status.length ? `Status: ${status.join(" ou ")}` : "Todos os status");
  if (setorNome) partes.push(`Setor: ${setorNome}`);
  if (f.de && f.ate) partes.push(`Criadas de ${dataBr(f.de)} a ${dataBr(f.ate)}`);
  else if (f.de) partes.push(`Criadas a partir de ${dataBr(f.de)}`);
  else if (f.ate) partes.push(`Criadas até ${dataBr(f.ate)}`);
  return partes.join("   ·   ");
}

export async function GET(request: Request) {
  const profile = await requireProfile();

  const { searchParams } = new URL(request.url);
  const filters = parseSolicitacoesFilters(Object.fromEntries(searchParams));

  const scope: Prisma.SolicitacaoCompraWhereInput =
    profile.role === "GESTOR" ? { requisitanteId: profile.id } : {};
  const where = buildSolicitacoesWhere(scope, filters);

  const [solicitacoes, setor] = await Promise.all([
    prisma.solicitacaoCompra.findMany({
      where,
      include: {
        setor: true,
        centroCusto: true,
        requisitante: true,
        aprovador: true,
        fornecedorAprovado: true,
        itens: { orderBy: { ordem: "asc" } },
        fornecedores: {
          orderBy: { ordem: "asc" },
          include: { cotacoes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    filters.setorId
      ? prisma.setor.findUnique({ where: { id: filters.setorId } })
      : Promise.resolve(null),
  ]);

  const descricao = descreverFiltros(
    filters,
    profile.role === "GESTOR" ? "Minhas solicitações" : "Todas as solicitações",
    setor?.nome ?? null
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Solicitação de Compras — Biodinâmica";
  workbook.title = "Solicitações de Compra";
  workbook.created = new Date();

  const resumo = criarPlanilha(workbook, {
    nome: "Solicitações",
    titulo: "Solicitações de Compra",
    descricao,
    geradoPor: profile.nome,
    colunas: [
      { header: "Número", key: "numero", width: 15, tipo: "centro" },
      { header: "Status", key: "status", width: 20, tipo: "centro" },
      { header: "Criada em", key: "createdAt", width: 16, tipo: "dataHora" },
      { header: "Setor", key: "setor", width: 20 },
      { header: "Centro de custo", key: "centroCusto", width: 28, tipo: "textoLongo" },
      { header: "Requisitante", key: "requisitante", width: 22 },
      { header: "Finalidade", key: "finalidade", width: 40, tipo: "textoLongo" },
      { header: "Justificativa", key: "justificativa", width: 40, tipo: "textoLongo" },
      { header: "Aprovador", key: "aprovador", width: 22 },
      { header: "Decidida em", key: "aprovadoEm", width: 16, tipo: "dataHora" },
      { header: "Fornecedor aprovado", key: "fornecedorAprovado", width: 26, tipo: "textoLongo" },
      { header: "Valor aprovado", key: "valorAprovado", width: 16, tipo: "moeda" },
      { header: "Motivo da reprovação", key: "motivo", width: 34, tipo: "textoLongo" },
    ],
  });

  for (const s of solicitacoes) {
    const totalAprovado = s.fornecedorAprovadoId
      ? s.fornecedores
          .find((f) => f.id === s.fornecedorAprovadoId)
          ?.cotacoes.reduce((sum, c) => sum + c.valorCentavos, 0)
      : undefined;

    resumo.adicionarLinha({
      numero: s.numero,
      status: STATUS_LABEL[s.status],
      createdAt: dataExcel(s.createdAt),
      setor: s.setor.nome,
      centroCusto: `${s.centroCusto.codigo} — ${s.centroCusto.descricao}`,
      requisitante: s.requisitante.nome,
      finalidade: s.finalidade,
      justificativa: s.justificativa,
      aprovador: s.aprovador?.nome ?? "",
      aprovadoEm: dataExcel(s.aprovadoEm),
      fornecedorAprovado: s.fornecedorAprovado?.nome ?? "",
      valorAprovado: totalAprovado !== undefined ? totalAprovado / 100 : null,
      motivo: s.motivoReprovacao ?? "",
    });
  }
  resumo.finalizar({ rotulo: "Total aprovado", somar: ["valorAprovado"] });

  // Segunda aba: detalhamento item a item, com valor total e valor por
  // unidade cotados em cada fornecedor (o que a listagem principal não
  // consegue mostrar numa única linha por solicitação).
  const itens = criarPlanilha(workbook, {
    nome: "Itens e cotações",
    titulo: "Itens e cotações por fornecedor",
    descricao,
    geradoPor: profile.nome,
    colunas: [
      { header: "Número", key: "numero", width: 15, tipo: "centro" },
      { header: "Item", key: "item", width: 44, tipo: "textoLongo" },
      { header: "Qtd.", key: "quantidade", width: 9, tipo: "numero" },
      { header: "Un.", key: "unidade", width: 8, tipo: "centro" },
      { header: "Fornecedor", key: "fornecedor", width: 28, tipo: "textoLongo" },
      { header: "Escolhido", key: "aprovado", width: 11, tipo: "centro" },
      { header: "Valor por unidade", key: "valorUnidade", width: 17, tipo: "moeda" },
      { header: "Valor total", key: "valorTotal", width: 16, tipo: "moeda" },
    ],
  });

  for (const s of solicitacoes) {
    const itensPorId = new Map(s.itens.map((item) => [item.id, item]));
    for (const f of s.fornecedores) {
      for (const c of f.cotacoes) {
        const item = itensPorId.get(c.itemId);
        if (!item) continue;
        itens.adicionarLinha({
          numero: s.numero,
          item: item.especificacao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          fornecedor: f.nome,
          aprovado: f.id === s.fornecedorAprovadoId ? "Sim" : "—",
          valorUnidade: item.quantidade ? c.valorCentavos / 100 / item.quantidade : null,
          valorTotal: c.valorCentavos / 100,
        });
      }
    }
  }
  // Sem linha de total aqui: somaria as cotações de todos os fornecedores,
  // inclusive os não escolhidos — o número não significaria nada.
  itens.finalizar();

  return respostaExcel(workbook, "solicitacoes");
}
