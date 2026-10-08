import type { Profile, SolicitacaoCompra } from "@/generated/prisma";

export type SolicitacaoFlags = {
  isOwnerGestor: boolean;
  podeAprovar: boolean;
  podeConcluir: boolean;
  podeCancelar: boolean;
};

/** Sem acesso a banco — só compara role/status, roda igual no server (página
 * standalone) e no client (depois do fetch lazy do expand). */
export function computeSolicitacaoFlags(
  profile: Pick<Profile, "id" | "role">,
  solicitacao: Pick<SolicitacaoCompra, "status" | "requisitanteId">
): SolicitacaoFlags {
  const isOwnerGestor =
    profile.role === "GESTOR" && solicitacao.requisitanteId === profile.id;
  const podeAprovar =
    solicitacao.status === "AGUARDANDO_APROVACAO" &&
    (profile.role === "DIRETORIA" || profile.role === "ADMIN");
  const podeConcluir = solicitacao.status === "APROVADA" && profile.role === "ADMIN";
  const podeCancelar =
    ["AGUARDANDO_APROVACAO", "EM_COTACAO"].includes(solicitacao.status) &&
    (isOwnerGestor || profile.role === "ADMIN");

  return { isOwnerGestor, podeAprovar, podeConcluir, podeCancelar };
}
