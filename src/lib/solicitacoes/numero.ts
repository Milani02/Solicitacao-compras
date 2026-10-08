import "server-only";
import { prisma } from "@/lib/prisma";

/** Gera número sequencial por ano, ex: SC-0001-2026. O contador continua
 * chaveado por ano (reseta a cada ano novo) — só a ordem de exibição muda,
 * com o ano no final. Incremento atômico via upsert. */
export async function gerarNumeroSolicitacao() {
  const ano = new Date().getFullYear();
  const counterId = `SC-${ano}`;

  const counter = await prisma.counter.upsert({
    where: { id: counterId },
    create: { id: counterId, valor: 1 },
    update: { valor: { increment: 1 } },
  });

  return `SC-${String(counter.valor).padStart(4, "0")}-${ano}`;
}
