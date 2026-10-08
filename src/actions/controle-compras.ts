"use server";

import { revalidatePath } from "next/cache";
import { requireControleCompras } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

type ActionResult = { error?: string };

/** Atualiza nota fiscal e observações de uma solicitação aprovada — campos
 * de controle financeiro, fora do fluxo de aprovação em si. */
export async function atualizarControleCompra(
  id: string,
  data: { notaFiscal: string; observacoes: string }
): Promise<ActionResult> {
  await requireControleCompras();

  const solicitacao = await prisma.solicitacaoCompra.findUnique({ where: { id } });
  if (!solicitacao || solicitacao.status !== "APROVADA") {
    return { error: "Esta solicitação não está mais disponível para controle." };
  }

  await prisma.solicitacaoCompra.update({
    where: { id },
    data: {
      notaFiscal: data.notaFiscal.trim() || null,
      observacoes: data.observacoes.trim() || null,
    },
  });

  revalidatePath("/controle-compras");
  return {};
}
