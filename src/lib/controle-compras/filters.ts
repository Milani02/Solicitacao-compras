import type { Prisma } from "@/generated/prisma";

export type ControleComprasFilterInput = {
  de?: string;
  ate?: string;
  /** "pendente" filtra só quem ainda não tem nota fiscal preenchida. */
  nf?: string;
  /** "aprovada" (ainda sem NF) ou "concluida" (NF lançada); vazio = as duas. */
  situacao?: string;
  q?: string;
};

/** Situações que a tela acompanha: a compra aprovada continua aqui depois
 * de concluída (ao lançar a NF), senão some do controle financeiro. */
export const STATUS_CONTROLE_COMPRAS = ["APROVADA", "CONCLUIDA"] as const;

export function parseControleComprasFilters(
  params: Record<string, string | string[] | undefined>
): ControleComprasFilterInput {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    de: one(params.de) || undefined,
    ate: one(params.ate) || undefined,
    nf: one(params.nf) || undefined,
    situacao: one(params.situacao) || undefined,
    q: one(params.q) || undefined,
  };
}

/** Usado tanto pela listagem/KPIs quanto pela exportação em Excel, pra
 * nunca divergirem. Sempre restrito a compras aprovadas ou concluídas. */
export function buildControleComprasWhere(
  filters: ControleComprasFilterInput
): Prisma.SolicitacaoCompraWhereInput {
  const where: Prisma.SolicitacaoCompraWhereInput = {
    status:
      filters.situacao === "aprovada"
        ? "APROVADA"
        : filters.situacao === "concluida"
          ? "CONCLUIDA"
          : { in: [...STATUS_CONTROLE_COMPRAS] },
  };

  // Datas do filtro são dias de Brasília (UTC-3, sem horário de verão
  // desde 2019) — o servidor roda em UTC.
  if (filters.de || filters.ate) {
    where.aprovadoEm = {
      ...(filters.de ? { gte: new Date(`${filters.de}T00:00:00-03:00`) } : {}),
      ...(filters.ate ? { lte: new Date(`${filters.ate}T23:59:59.999-03:00`) } : {}),
    };
  }

  if (filters.nf === "pendente") {
    where.notaFiscal = null;
  }

  if (filters.q) {
    where.OR = [
      { numero: { contains: filters.q, mode: "insensitive" } },
      { notaFiscal: { contains: filters.q, mode: "insensitive" } },
      { requisitante: { nome: { contains: filters.q, mode: "insensitive" } } },
      { fornecedorAprovado: { nome: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  return where;
}
