"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireControleCompras } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { STATUS_CONTROLE_COMPRAS } from "@/lib/controle-compras/filters";
import { notificarStatus } from "@/lib/notificacoes/notificar";
import type { StatusSolicitacao } from "@/generated/prisma";

type ActionResult = { error?: string };

const ControleCompraSchema = z.object({
  notaFiscal: z.string().trim().max(60, { error: "A nota fiscal deve ter até 60 caracteres." }),
  observacoes: z.string().trim().max(1000, { error: "As observações devem ter até 1000 caracteres." }),
});

/** Atualiza nota fiscal e observações de uma compra aprovada ou concluída.
 * A nota fiscal é o que fecha a compra: lançá-la conclui a solicitação
 * automaticamente (ninguém precisa clicar em "concluir" — o Admin só
 * acompanha), e removê-la devolve a compra para "Aprovada". */
export async function atualizarControleCompra(
  id: string,
  data: { notaFiscal: string; observacoes: string }
): Promise<ActionResult> {
  const profile = await requireControleCompras();

  const parsed = ControleCompraSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const notaFiscal = parsed.data.notaFiscal || null;
  const observacoes = parsed.data.observacoes || null;

  const solicitacao = await prisma.solicitacaoCompra.findUnique({ where: { id } });
  if (
    !solicitacao ||
    !(STATUS_CONTROLE_COMPRAS as readonly string[]).includes(solicitacao.status)
  ) {
    return { error: "Esta solicitação não está mais disponível para controle." };
  }

  const statusNovo: StatusSolicitacao = notaFiscal ? "CONCLUIDA" : "APROVADA";
  const mudouStatus = statusNovo !== solicitacao.status;

  const atualizada = await prisma.solicitacaoCompra.update({
    where: { id },
    data: {
      notaFiscal,
      observacoes,
      ...(mudouStatus
        ? {
            status: statusNovo,
            historico: {
              create: {
                statusAnterior: solicitacao.status,
                statusNovo,
                usuarioId: profile.id,
                comentario: notaFiscal
                  ? `Compra concluída com a nota fiscal ${notaFiscal}.`
                  : "Nota fiscal removida — compra voltou para aprovada.",
              },
            },
          }
        : {}),
    },
    include: { requisitante: true, setor: true },
  });

  if (mudouStatus && statusNovo === "CONCLUIDA") {
    void notificarStatus(atualizada, statusNovo);
  }

  revalidatePath("/controle-compras");
  revalidatePath(`/solicitacoes/${id}`);
  revalidatePath("/solicitacoes");
  revalidatePath("/");
  return {};
}
