import type { Prisma } from "@/generated/prisma";

export type ControleComprasFilterInput = {
  de?: string;
  ate?: string;
  /** "pendente" filtra só quem ainda não tem nota fiscal preenchida. */
  nf?: string;
  q?: string;
};

export function parseControleComprasFilters(
  params: Record<string, string | string[] | undefined>
): ControleComprasFilterInput {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    de: one(params.de) || undefined,
    ate: one(params.ate) || undefined,
    nf: one(params.nf) || undefined,
    q: one(params.q) || undefined,
  };
}

/** Usado tanto pela listagem/KPIs quanto pela exportação em Excel, pra
 * nunca divergirem. Sempre restrito a APROVADA — é o propósito da tela. */
export function buildControleComprasWhere(
  filters: ControleComprasFilterInput
): Prisma.SolicitacaoCompraWhereInput {
  const where: Prisma.SolicitacaoCompraWhereInput = { status: "APROVADA" };

  if (filters.de || filters.ate) {
    where.aprovadoEm = {
      ...(filters.de ? { gte: new Date(`${filters.de}T00:00:00`) } : {}),
      ...(filters.ate ? { lte: new Date(`${filters.ate}T23:59:59.999`) } : {}),
    };
  }

  if (filters.nf === "pendente") {
    where.notaFiscal = null;
  }

  if (filters.q) {
    where.OR = [
      { numero: { contains: filters.q, mode: "insensitive" } },
      { requisitante: { nome: { contains: filters.q, mode: "insensitive" } } },
      { fornecedorAprovado: { nome: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  return where;
}
