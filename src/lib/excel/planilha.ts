import "server-only";
import type ExcelJS from "exceljs";

/** Padrão visual das exportações em Excel: sóbrio, sem cores — hierarquia
 * só com peso de fonte e bordas, pra imprimir bem e não brigar com o tema
 * de quem abre. Título e subtítulo no topo, cabeçalho com borda dupla,
 * linha de totais com fórmulas reais (continuam somando se a pessoa
 * filtrar ou editar), cabeçalho repetido na impressão. */

export type TipoColuna = "texto" | "textoLongo" | "moeda" | "numero" | "data" | "dataHora" | "centro";

export type ColunaPlanilha = {
  header: string;
  key: string;
  width: number;
  tipo?: TipoColuna;
};

const FONTE = "Calibri";
const LINHA_CABECALHO = 4;

const BORDA_FINA: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFBFBFBF" } };
const BORDA_FORTE: Partial<ExcelJS.Border> = { style: "medium", color: { argb: "FF000000" } };
const BORDA_DUPLA: Partial<ExcelJS.Border> = { style: "double", color: { argb: "FF000000" } };

const FORMATO: Partial<Record<TipoColuna, string>> = {
  moeda: '"R$" #,##0.00',
  numero: "#,##0.##",
  data: "dd/mm/yyyy",
  dataHora: "dd/mm/yyyy hh:mm",
};

const dataHoraFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** O Excel não tem fuso: grava a data "de parede". Desloca o instante para
 * que os campos UTC gravados pelo ExcelJS sejam o horário de Brasília
 * (UTC-3, sem horário de verão desde 2019). */
export function dataExcel(data: Date | null | undefined): Date | null {
  if (!data) return null;
  return new Date(data.getTime() - 3 * 60 * 60 * 1000);
}

export function letraColuna(n: number) {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function criarPlanilha(
  workbook: ExcelJS.Workbook,
  opcoes: {
    nome: string;
    titulo: string;
    /** Linha descritiva sob o título (filtros aplicados etc.). */
    descricao: string;
    geradoPor: string;
    colunas: ColunaPlanilha[];
  }
) {
  const { colunas } = opcoes;
  const ultimaLetra = letraColuna(colunas.length);

  const sheet = workbook.addWorksheet(opcoes.nome, {
    views: [{ state: "frozen", ySplit: LINHA_CABECALHO, showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
      printTitlesRow: `${LINHA_CABECALHO}:${LINHA_CABECALHO}`,
    },
    headerFooter: {
      oddFooter: `&L&8Biodinâmica · Solicitação de Compras&R&8Página &P de &N`,
    },
  });

  // Sem `header` aqui: o cabeçalho fica na linha 4, abaixo do título.
  sheet.columns = colunas.map((c) => ({ key: c.key, width: c.width }));

  const titulo = sheet.getCell("A1");
  titulo.value = opcoes.titulo;
  titulo.font = { name: FONTE, size: 16, bold: true };
  sheet.mergeCells(`A1:${ultimaLetra}1`);
  sheet.getRow(1).height = 26;

  const descricao = sheet.getCell("A2");
  descricao.value = `${opcoes.descricao}   ·   Gerado em ${dataHoraFmt.format(new Date())} por ${opcoes.geradoPor}`;
  descricao.font = { name: FONTE, size: 10, italic: true };
  sheet.mergeCells(`A2:${ultimaLetra}2`);
  sheet.getRow(3).height = 8;

  const cabecalho = sheet.getRow(LINHA_CABECALHO);
  colunas.forEach((c, i) => {
    const cell = cabecalho.getCell(i + 1);
    cell.value = c.header.toUpperCase();
    cell.font = { name: FONTE, size: 10, bold: true };
    cell.alignment = {
      vertical: "middle",
      wrapText: true,
      horizontal:
        c.tipo === "moeda" || c.tipo === "numero"
          ? "right"
          : c.tipo === "centro" || c.tipo === "data" || c.tipo === "dataHora"
            ? "center"
            : "left",
    };
    cell.border = { top: BORDA_FORTE, bottom: BORDA_FORTE };
  });
  cabecalho.height = 30;

  let linhas = 0;

  function adicionarLinha(valores: Record<string, unknown>) {
    const row = sheet.addRow(valores);
    linhas++;
    colunas.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.font = { name: FONTE, size: 10 };
      cell.border = { bottom: BORDA_FINA };
      const formato = c.tipo ? FORMATO[c.tipo] : undefined;
      if (formato) cell.numFmt = formato;
      cell.alignment = {
        vertical: "top",
        wrapText: c.tipo === "textoLongo",
        horizontal:
          c.tipo === "moeda" || c.tipo === "numero"
            ? "right"
            : c.tipo === "centro" || c.tipo === "data" || c.tipo === "dataHora"
              ? "center"
              : "left",
      };
    });
    return row;
  }

  /** Fecha a planilha: linha de totais (contagem + somas por fórmula) e
   * autofiltro. Chamar depois de adicionar todas as linhas. */
  function finalizar(totais?: { rotulo: string; somar: string[] }) {
    const primeiraDados = LINHA_CABECALHO + 1;

    if (linhas === 0) {
      const vazio = sheet.addRow([]);
      const cell = vazio.getCell(1);
      cell.value = "Nenhum registro para os filtros selecionados.";
      cell.font = { name: FONTE, size: 10, italic: true };
      sheet.mergeCells(`A${vazio.number}:${ultimaLetra}${vazio.number}`);
      vazio.height = 24;
      return;
    }

    const ultimaDados = LINHA_CABECALHO + linhas;
    sheet.autoFilter = { from: `A${LINHA_CABECALHO}`, to: `${ultimaLetra}${ultimaDados}` };

    if (!totais) {
      // Fecha a tabela com a mesma borda forte do cabeçalho.
      sheet.getRow(ultimaDados).eachCell({ includeEmpty: true }, (cell) => {
        cell.border = { bottom: BORDA_FORTE };
      });
      return;
    }

    const total = sheet.addRow([]);
    total.height = 22;
    colunas.forEach((c, i) => {
      const cell = total.getCell(i + 1);
      cell.font = { name: FONTE, size: 10, bold: true };
      cell.border = { top: BORDA_DUPLA, bottom: BORDA_FORTE };
      cell.alignment = { vertical: "middle", horizontal: c.tipo === "moeda" ? "right" : "left" };
      if (totais.somar.includes(c.key)) {
        const letra = letraColuna(i + 1);
        // SUBTOTAL(109, …) soma só as linhas visíveis: o total acompanha o
        // autofiltro quando a pessoa filtra dentro do Excel.
        cell.value = {
          formula: `SUBTOTAL(109,${letra}${primeiraDados}:${letra}${ultimaDados})`,
        };
        cell.numFmt = FORMATO[c.tipo ?? "moeda"] ?? FORMATO.moeda!;
      }
    });
    const rotulo = total.getCell(1);
    rotulo.value = `${totais.rotulo} (${linhas} ${linhas === 1 ? "registro" : "registros"})`;
  }

  return { sheet, adicionarLinha, finalizar };
}

export async function respostaExcel(workbook: ExcelJS.Workbook, nomeBase: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeBase}-${hoje}.xlsx"`,
    },
  });
}
