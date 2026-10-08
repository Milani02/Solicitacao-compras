import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/solicitacoes/status";
import type { StatusSolicitacao } from "@/generated/prisma";

export function StatusBadge({
  status,
  className,
}: {
  status: StatusSolicitacao;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_BADGE_CLASS[status], className)}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
