import ExcelJS from "exceljs";
import { requireProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL } from "@/lib/solicitacoes/status";
import { parseSolicitacoesFilters, buildSolicitacoesWhere } from "@/lib/solicitacoes/filters";
import { formatCentavos, formatCentavosPorUnidade } from "@/lib/format";
import type { Prisma } from "@/generated/prisma";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export async function GET(request: Request) {
  const profile = await requireProfile();

  const { searchParams } = new URL(request.url);
  const filters = parseSolicitacoesFilters(Object.fromEntries(searchParams));

  const scope: Prisma.SolicitacaoCompraWhereInput =
    profile.role === "GESTOR" ? { requisitanteId: profile.id } : {};
  const where = buildSolicitacoesWhere(scope, filters);

  const solicitacoes = await prisma.solicitacaoCompra.findMany({
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
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Solicitação de Compras — Biodinâmica";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Solicitações");

  sheet.columns = [
    { header: "Número", key: "numero", width: 16 },
    { header: "Status", key: "status", width: 26 },
    { header: "Setor", key: "setor", width: 22 },
    { header: "Centro de custo", key: "centroCusto", width: 26 },
    { header: "Requisitante", key: "requisitante", width: 22 },
    { header: "Aprovador", key: "aprovador", width: 22 },
    { header: "Finalidade", key: "finalidade", width: 40 },
    { header: "Justificativa", key: "justificativa", width: 40 },
    { header: "Fornecedor aprovado", key: "fornecedorAprovado", width: 24 },
    { header: "Valor total aprovado (R$)", key: "valorAprovado", width: 20 },
    { header: "Criada em", key: "createdAt", width: 18 },
    { header: "Aprovada em", key: "aprovadoEm", width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  for (const s of solicitacoes) {
    const totalAprovado = s.fornecedorAprovado
      ? s.fornecedores
          .find((f) => f.id === s.fornecedorAprovado!.id)
          ?.cotacoes.reduce((sum, c) => sum + c.valorCentavos, 0)
      : undefined;

    sheet.addRow({
      numero: s.numero,
      status: STATUS_LABEL[s.status],
      setor: s.setor.nome,
      centroCusto: `${s.centroCusto.codigo} — ${s.centroCusto.descricao}`,
      requisitante: s.requisitante.nome,
      aprovador: s.aprovador?.nome ?? "",
      finalidade: s.finalidade,
      justificativa: s.justificativa,
      fornecedorAprovado: s.fornecedorAprovado?.nome ?? "",
      valorAprovado: totalAprovado !== undefined ? formatCentavos(totalAprovado) : "",
      createdAt: dateTimeFmt.format(s.createdAt),
      aprovadoEm: s.aprovadoEm ? dateTimeFmt.format(s.aprovadoEm) : "",
    });
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length },
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // Segunda aba: detalhamento item a item, com valor total e valor por
  // unidade cotados em cada fornecedor (o que a listagem principal não
  // consegue mostrar numa única linha por solicitação).
  const itensSheet = workbook.addWorksheet("Itens e valores");
  itensSheet.columns = [
    { header: "Número", key: "numero", width: 16 },
    { header: "Item", key: "item", width: 40 },
    { header: "Quantidade", key: "quantidade", width: 14 },
    { header: "Unidade", key: "unidade", width: 12 },
    { header: "Fornecedor", key: "fornecedor", width: 24 },
    { header: "Fornecedor aprovado?", key: "aprovado", width: 18 },
    { header: "Valor total (R$)", key: "valorTotal", width: 18 },
    { header: "Valor por unidade (R$)", key: "valorUnidade", width: 20 },
  ];
  itensSheet.getRow(1).font = { bold: true };
  itensSheet.getRow(1).alignment = { vertical: "middle" };

  for (const s of solicitacoes) {
    const itensPorId = new Map(s.itens.map((item) => [item.id, item]));
    for (const f of s.fornecedores) {
      for (const c of f.cotacoes) {
        const item = itensPorId.get(c.itemId);
        if (!item) continue;
        itensSheet.addRow({
          numero: s.numero,
          item: item.especificacao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          fornecedor: f.nome,
          aprovado: f.id === s.fornecedorAprovadoId ? "Sim" : "",
          valorTotal: formatCentavos(c.valorCentavos),
          valorUnidade: formatCentavosPorUnidade(c.valorCentavos, item.quantidade),
        });
      }
    }
  }

  itensSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: itensSheet.columns.length },
  };
  itensSheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `solicitacoes-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
