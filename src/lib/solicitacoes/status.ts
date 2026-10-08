import type { StatusSolicitacao } from "@/generated/prisma";

export const STATUS_LABEL: Record<StatusSolicitacao, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  EM_COTACAO: "Em cotação",
  AGUARDANDO_APROVACAO_FINAL: "Aguardando aprovação final",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const STATUS_BADGE_CLASS: Record<StatusSolicitacao, string> = {
  RASCUNHO: "border-border text-muted-foreground",
  AGUARDANDO_APROVACAO:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  EM_COTACAO:
    "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900",
  AGUARDANDO_APROVACAO_FINAL:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
  APROVADA:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
  REPROVADA:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
  CONCLUIDA: "border-primary/30 bg-primary/10 text-primary",
  CANCELADA: "border-border bg-muted text-muted-foreground",
};
