"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { atualizarControleCompra } from "@/actions/controle-compras";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field";

export function ControleComprasRowEditor({
  id,
  notaFiscal: notaFiscalInicial,
  observacoes: observacoesInicial,
}: {
  id: string;
  notaFiscal: string;
  observacoes: string;
}) {
  const router = useRouter();
  const [notaFiscal, setNotaFiscal] = useState(notaFiscalInicial);
  const [observacoes, setObservacoes] = useState(observacoesInicial);
  const [, startTransition] = useTransition();

  function salvar(next: { notaFiscal: string; observacoes: string }) {
    if (next.notaFiscal === notaFiscalInicial && next.observacoes === observacoesInicial) return;

    startTransition(async () => {
      const result = await atualizarControleCompra(id, next);
      if (result?.error) toast.error(result.error);
      // Atualiza o card (badge "NF ok"/"NF pendente", cor da borda, KPI
      // "Aguardando nota fiscal") sem perder o estado de expandido das
      // outras linhas — só os dados vêm do servidor de novo.
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-wrap gap-3">
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <FieldLabel htmlFor={`nf-${id}`} className="text-xs text-muted-foreground">
          Nota fiscal
        </FieldLabel>
        <Input
          id={`nf-${id}`}
          value={notaFiscal}
          placeholder="Nº nota fiscal"
          onChange={(e) => setNotaFiscal(e.target.value)}
          onBlur={() => salvar({ notaFiscal, observacoes })}
          className="h-8"
        />
      </div>
      <div className="flex min-w-56 flex-2 flex-col gap-1">
        <FieldLabel htmlFor={`obs-${id}`} className="text-xs text-muted-foreground">
          Observações
        </FieldLabel>
        <Input
          id={`obs-${id}`}
          value={observacoes}
          placeholder="Observações"
          onChange={(e) => setObservacoes(e.target.value)}
          onBlur={() => salvar({ notaFiscal, observacoes })}
          className="h-8"
        />
      </div>
    </div>
  );
}
