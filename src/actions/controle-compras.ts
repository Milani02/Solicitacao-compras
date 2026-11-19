"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireControleCompras } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { STATUS_CONTROLE_COMPRAS } from "@/lib/controle-compras/filters";

type ActionResult = { error?: string };

const ControleCompraSchema = z.object({
  notaFiscal: z.string().trim().max(60, { error: "A nota fiscal deve ter até 60 caracteres." }),
  observacoes: z.string().trim().max(1000, { error: "As observações devem ter até 1000 caracteres." }),
});

/** Atualiza nota fiscal e observações de uma compra aprovada ou já
 * concluída — campos de controle financeiro, fora do fluxo de aprovação. */
export async function atualizarControleCompra(
  id: string,
  data: { notaFiscal: string; observacoes: string }
): Promise<ActionResult> {
  await requireControleCompras();

  const parsed = ControleCompraSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const solicitacao = await prisma.solicitacaoCompra.findUnique({ where: { id } });
  if (
    !solicitacao ||
    !(STATUS_CONTROLE_COMPRAS as readonly string[]).includes(solicitacao.status)
  ) {
    return { error: "Esta solicitação não está mais disponível para controle." };
  }

  await prisma.solicitacaoCompra.update({
    where: { id },
    data: {
      notaFiscal: parsed.data.notaFiscal || null,
      observacoes: parsed.data.observacoes || null,
    },
  });

  revalidatePath("/controle-compras");
  return {};
}
