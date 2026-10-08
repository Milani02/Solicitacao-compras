import { History } from "lucide-react";
import { STATUS_LABEL } from "@/lib/solicitacoes/status";
import type { StatusSolicitacao } from "@/generated/prisma";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Entry = {
  id: string;
  statusNovo: StatusSolicitacao;
  comentario: string | null;
  createdAt: Date;
  usuarioNome: string | null;
};

export function Timeline({ historico }: { historico: Entry[] }) {
  const lastIndex = historico.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="size-4" />
        Histórico
      </div>
      <ol className="flex flex-col gap-5 border-l pl-5">
        {historico.map((h, i) => {
          const isCurrent = i === lastIndex;
          return (
            <li key={h.id} className="relative">
              <span
                className={
                  isCurrent
                    ? "absolute -left-[26px] top-1 size-2.5 rounded-full bg-brand-gradient ring-4 ring-brand-gold/15"
                    : "absolute -left-[26px] top-1 size-2.5 rounded-full bg-muted-foreground/30"
                }
              />
              <p className="text-sm font-medium">{STATUS_LABEL[h.statusNovo]}</p>
              {h.comentario && (
                <p className="text-sm text-muted-foreground">{h.comentario}</p>
              )}
              <p className="font-data mt-0.5 text-xs text-muted-foreground">
                {h.usuarioNome ?? "Sistema"} · {dateTimeFmt.format(h.createdAt)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
