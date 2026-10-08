import ExcelJS from "exceljs";
import { requireControleCompras } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { parseControleComprasFilters, buildControleComprasWhere } from "@/lib/controle-compras/filters";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export async function GET(request: Request) {
  await requireControleCompras();

  const { searchParams } = new URL(request.url);
  const filters = parseControleComprasFilters(Object.fromEntries(searchParams));
  const where = buildControleComprasWhere(filters);

  const solicitacoes = await prisma.solicitacaoCompra.findMany({
    where,
    include: {
      requisitante: true,
      fornecedorAprovado: true,
      itens: { orderBy: { ordem: "asc" } },
    },
    orderBy: { aprovadoEm: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Solicitação de Compras — Biodinâmica";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Controle de Compras");

  sheet.columns = [
    { header: "NÚMERO", key: "numero", width: 16 },
    { header: "REQUISITANTE", key: "requisitante", width: 22 },
    { header: "DATA", key: "data", width: 14 },
    { header: "FORNECEDOR", key: "fornecedor", width: 24 },
    { header: "PRODUTOS", key: "produtos", width: 50 },
    { header: "NOTA FISCAL", key: "notaFiscal", width: 18 },
    { header: "OBSERVAÇÕES", key: "observacoes", width: 32 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  for (const s of solicitacoes) {
    const produtos = s.itens
      .map((item) => `${item.quantidade} ${item.unidade} — ${item.especificacao}`)
      .join("; ");

    sheet.addRow({
      numero: s.numero,
      requisitante: s.requisitante.nome,
      data: s.aprovadoEm ? dateFmt.format(s.aprovadoEm) : "",
      fornecedor: s.fornecedorAprovado?.nome ?? "",
      produtos,
      notaFiscal: s.notaFiscal ?? "",
      observacoes: s.observacoes ?? "",
    });
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length },
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `controle-de-compras-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
