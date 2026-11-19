import ExcelJS from "exceljs";
import { requireControleCompras } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
  parseControleComprasFilters,
  buildControleComprasWhere,
  type ControleComprasFilterInput,
} from "@/lib/controle-compras/filters";
import { STATUS_LABEL } from "@/lib/solicitacoes/status";
import { criarPlanilha, dataExcel, respostaExcel } from "@/lib/excel/planilha";

function dataBr(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function descreverFiltros(f: ControleComprasFilterInput) {
  const partes = [
    f.situacao === "aprovada"
      ? "Situação: aprovadas (em andamento)"
      : f.situacao === "concluida"
        ? "Situação: concluídas"
        : "Situação: aprovadas e concluídas",
  ];
  if (f.de && f.ate) partes.push(`Período de aprovação: ${dataBr(f.de)} a ${dataBr(f.ate)}`);
  else if (f.de) partes.push(`Aprovadas a partir de ${dataBr(f.de)}`);
  else if (f.ate) partes.push(`Aprovadas até ${dataBr(f.ate)}`);
  if (f.nf === "pendente") partes.push("Somente sem nota fiscal");
  if (f.q) partes.push(`Busca: "${f.q}"`);
  return partes.join("   ·   ");
}

export async function GET(request: Request) {
  const profile = await requireControleCompras();

  const { searchParams } = new URL(request.url);
  const filters = parseControleComprasFilters(Object.fromEntries(searchParams));
  const where = buildControleComprasWhere(filters);

  const solicitacoes = await prisma.solicitacaoCompra.findMany({
    where,
    include: {
      requisitante: true,
      setor: true,
      centroCusto: true,
      fornecedorAprovado: { include: { cotacoes: true } },
      itens: { orderBy: { ordem: "asc" } },
    },
    orderBy: { aprovadoEm: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Solicitação de Compras — Biodinâmica";
  workbook.title = "Controle de Compras";
  workbook.created = new Date();

  const { adicionarLinha, finalizar } = criarPlanilha(workbook, {
    nome: "Controle de Compras",
    titulo: "Controle de Compras",
    descricao: descreverFiltros(filters),
    geradoPor: profile.nome,
    colunas: [
      { header: "Número", key: "numero", width: 15, tipo: "centro" },
      { header: "Situação", key: "situacao", width: 12, tipo: "centro" },
      { header: "Aprovada em", key: "aprovadoEm", width: 13, tipo: "data" },
      { header: "Requisitante", key: "requisitante", width: 22 },
      { header: "Setor", key: "setor", width: 20 },
      { header: "Centro de custo", key: "centroCusto", width: 28, tipo: "textoLongo" },
      { header: "Fornecedor", key: "fornecedor", width: 26, tipo: "textoLongo" },
      { header: "Produtos", key: "produtos", width: 46, tipo: "textoLongo" },
      { header: "Valor total", key: "valor", width: 16, tipo: "moeda" },
      { header: "Nota fiscal", key: "notaFiscal", width: 16, tipo: "centro" },
      { header: "Observações", key: "observacoes", width: 34, tipo: "textoLongo" },
    ],
  });

  for (const s of solicitacoes) {
    const totalCentavos =
      s.fornecedorAprovado?.cotacoes.reduce((sum, c) => sum + c.valorCentavos, 0) ?? 0;

    adicionarLinha({
      numero: s.numero,
      situacao: STATUS_LABEL[s.status],
      aprovadoEm: dataExcel(s.aprovadoEm),
      requisitante: s.requisitante.nome,
      setor: s.setor.nome,
      centroCusto: `${s.centroCusto.codigo} — ${s.centroCusto.descricao}`,
      fornecedor: s.fornecedorAprovado?.nome ?? "",
      // Um item por linha dentro da célula: mais legível que separar por ";".
      produtos: s.itens
        .map((item) => `${item.quantidade} ${item.unidade} — ${item.especificacao}`)
        .join("\n"),
      valor: totalCentavos / 100,
      notaFiscal: s.notaFiscal ?? "Pendente",
      observacoes: s.observacoes ?? "",
    });
  }

  finalizar({ rotulo: "Total", somar: ["valor"] });

  return respostaExcel(workbook, "controle-de-compras");
}
