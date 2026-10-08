import type { Prisma, StatusSolicitacao } from "@/generated/prisma";
import { STATUS_LABEL } from "@/lib/solicitacoes/status";

const VALID_STATUS = new Set(Object.keys(STATUS_LABEL));

export type SolicitacoesFilterInput = {
  status?: string;
  setorId?: string;
  de?: string;
  ate?: string;
};

export function parseSolicitacoesFilters(
  params: Record<string, string | string[] | undefined>
): SolicitacoesFilterInput {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    status: one(params.status) || undefined,
    setorId: one(params.setorId) || undefined,
    de: one(params.de) || undefined,
    ate: one(params.ate) || undefined,
  };
}

/** Aplica os filtros da tela sobre um escopo já restrito por papel (GESTOR
 * vê só as próprias solicitações). Usado tanto pela listagem quanto pela
 * exportação em Excel, para que os dois nunca divirjam. */
export function buildSolicitacoesWhere(
  scope: Prisma.SolicitacaoCompraWhereInput,
  filters: SolicitacoesFilterInput
): Prisma.SolicitacaoCompraWhereInput {
  const where: Prisma.SolicitacaoCompraWhereInput = { ...scope };

  // Aceita múltiplos status separados por vírgula (ex: os cards de KPI de
  // "Aguardando aprovação" filtram por duas etapas de status de uma vez).
  if (filters.status) {
    const statuses = filters.status
      .split(",")
      .filter((s): s is StatusSolicitacao => VALID_STATUS.has(s));
    if (statuses.length === 1) {
      where.status = statuses[0];
    } else if (statuses.length > 1) {
      where.status = { in: statuses };
    }
  }

  if (filters.setorId) {
    where.setorId = filters.setorId;
  }

  if (filters.de || filters.ate) {
    where.createdAt = {
      ...(filters.de ? { gte: new Date(`${filters.de}T00:00:00`) } : {}),
      ...(filters.ate ? { lte: new Date(`${filters.ate}T23:59:59.999`) } : {}),
    };
  }

  return where;
}
