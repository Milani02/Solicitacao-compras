"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { gerarNumeroSolicitacao } from "@/lib/solicitacoes/numero";
import { NovaSolicitacaoSchema, type NovaSolicitacaoInput } from "@/lib/solicitacoes/schemas";
import { notificarStatus } from "@/lib/notificacoes/notificar";
import { notificarN8nNovaSolicitacao } from "@/lib/notificacoes/n8n";
import { signedUrlsForAnexos } from "@/lib/anexos-cotacao";
import { computeSolicitacaoFlags, type SolicitacaoFlags } from "@/lib/solicitacoes/permissions";
import type {
  AnexoPorOrdem,
  SolicitacaoDetalhada,
} from "@/app/(app)/solicitacoes/[id]/detail-content";
import type { StatusSolicitacao } from "@/generated/prisma";

type ActionResult<T = undefined> = { error?: string; data?: T };

/** Busca sob demanda o detalhe completo de uma solicitação (itens,
 * cotações, anexos, histórico) — usado pelo expand inline nas listas de
 * Solicitações e Controle de Compras, que só trazem colunas leves na
 * listagem. Mesma trava de visibilidade da página standalone
 * (/solicitacoes/[id]). */
export async function buscarDetalheSolicitacao(
  id: string
): Promise<
  ActionResult<{
    solicitacao: SolicitacaoDetalhada;
    anexosPorOrdem: AnexoPorOrdem;
    flags: SolicitacaoFlags;
  }>
> {
  const profile = await requireProfile();

  const solicitacao = await prisma.solicitacaoCompra.findUnique({
    where: { id },
    include: {
      requisitante: true,
      itens: { orderBy: { ordem: "asc" } },
      fornecedores: {
        orderBy: { ordem: "asc" },
        include: { cotacoes: true },
      },
      anexosCotacao: { orderBy: { createdAt: "asc" } },
      historico: {
        orderBy: { createdAt: "asc" },
        include: { usuario: true },
      },
    },
  });
  if (!solicitacao) return { error: "Solicitação não encontrada." };

  if (
    profile.role === "GESTOR" &&
    !profile.controleCompras &&
    solicitacao.requisitanteId !== profile.id
  ) {
    return { error: "Você não tem acesso a esta solicitação." };
  }

  const anexosUrls = await signedUrlsForAnexos(solicitacao.anexosCotacao.map((a) => a.path));
  const anexosPorOrdem: AnexoPorOrdem = {};
  for (const a of solicitacao.anexosCotacao) {
    const url = anexosUrls[a.path];
    if (!url) continue;
    (anexosPorOrdem[a.fornecedorOrdem] ??= []).push({
      id: a.id,
      url,
      nomeArquivo: a.nomeArquivo,
    });
  }

  return {
    data: {
      solicitacao,
      anexosPorOrdem,
      flags: computeSolicitacaoFlags(profile, solicitacao),
    },
  };
}

/** Cria a solicitação já com itens e cotação de fornecedores (preços e/ou
 * prints, anexados depois via enviarAnexoCotacao) e manda direto para a
 * Diretoria decidir — sem etapa de pré-aprovação/liberação para cotação. */
export async function criarSolicitacao(
  input: NovaSolicitacaoInput
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole("GESTOR");

  const parsed = NovaSolicitacaoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos do formulário." };
  }
  const data = parsed.data;

  // O setor vem do formulário só por conveniência (a UI já trava no setor
  // do gestor) — nunca confiar nele para decidir a que setor a solicitação
  // pertence. Sempre usar o setor do próprio perfil, senão um gestor
  // poderia forjar o payload e lançar a compra no centro de custo de outro
  // setor.
  if (data.setorId !== profile.setorId) {
    return { error: "Você só pode criar solicitações para o seu próprio setor." };
  }

  // O centro de custo pode ser de qualquer setor — o gestor escolhe o que
  // fizer sentido pra compra, não só os do próprio setor. Só precisa
  // existir de verdade.
  const centroCusto = await prisma.centroCusto.findUnique({
    where: { id: data.centroCustoId },
  });
  if (!centroCusto) {
    return { error: "Centro de custo inválido." };
  }

  for (const f of data.fornecedores) {
    for (const c of f.cotacoes) {
      if (c.itemIndex < 0 || c.itemIndex >= data.itens.length) {
        return { error: "Item de cotação inválido." };
      }
    }
  }

  const numero = await gerarNumeroSolicitacao();

  const solicitacao = await prisma.solicitacaoCompra.create({
    data: {
      numero,
      status: "AGUARDANDO_APROVACAO",
      requisitanteId: profile.id,
      setorId: data.setorId,
      centroCustoId: data.centroCustoId,
      finalidade: data.finalidade,
      justificativa: data.justificativa,
      enviadaEm: new Date(),
      itens: {
        create: data.itens.map((item, ordem) => ({
          ordem,
          codigo: item.codigo || null,
          quantidade: item.quantidade,
          unidade: item.unidade,
          especificacao: item.especificacao,
        })),
      },
      historico: {
        create: {
          statusAnterior: null,
          statusNovo: "AGUARDANDO_APROVACAO",
          usuarioId: profile.id,
          comentario: "Solicitação criada, cotada e enviada para aprovação.",
        },
      },
    },
    include: { itens: { orderBy: { ordem: "asc" } }, requisitante: true, setor: true },
  });

  await prisma.$transaction(
    data.fornecedores.map((f, i) =>
      prisma.fornecedor.create({
        data: {
          solicitacaoId: solicitacao.id,
          ordem: i + 1,
          nome: f.nome,
          telefone: f.telefone || null,
          contato: f.contato || null,
          cotacoes: {
            create: f.cotacoes.map((c) => ({
              itemId: solicitacao.itens[c.itemIndex].id,
              valorCentavos: c.valorCentavos,
            })),
          },
        },
      })
    )
  );

  // Sem await de propósito: e-mail/webhook são best-effort, não devem
  // segurar a resposta da action (o gestor não precisa esperar o SMTP ou
  // o n8n responderem).
  void notificarStatus(solicitacao, "AGUARDANDO_APROVACAO");
  void notificarN8nNovaSolicitacao({
    id: solicitacao.id,
    numero: solicitacao.numero,
    requisitanteNome: solicitacao.requisitante.nome,
    setorNome: solicitacao.setor.nome,
    finalidade: solicitacao.finalidade,
    justificativa: solicitacao.justificativa,
    fornecedores: data.fornecedores.map((f) => ({
      nome: f.nome,
      totalCentavos: f.cotacoes.reduce((sum, c) => sum + c.valorCentavos, 0),
    })),
  });

  revalidatePath("/solicitacoes");
  return { data: { id: solicitacao.id } };
}

async function transicionar(
  id: string,
  statusAnterior: StatusSolicitacao,
  statusNovo: Parameters<typeof prisma.solicitacaoCompra.update>[0]["data"]["status"],
  usuarioId: string,
  comentario: string,
  extra?: Record<string, unknown>
) {
  const atualizada = await prisma.solicitacaoCompra.update({
    where: { id },
    data: {
      status: statusNovo,
      ...extra,
      historico: {
        create: {
          statusAnterior,
          statusNovo: statusNovo as never,
          usuarioId,
          comentario,
        },
      },
    },
    include: { requisitante: true, setor: true },
  });

  void notificarStatus(atualizada, statusNovo as never);
  revalidatePath(`/solicitacoes/${id}`);
  revalidatePath("/solicitacoes");
  revalidatePath("/");
}

/** Decisão única da Diretoria: a solicitação já chega com itens e cotação
 * de fornecedores prontos (preenchidos na criação) — sem etapa intermediária
 * de pré-aprovação/liberação para cotação. */
export async function aprovar(
  id: string,
  fornecedorAprovadoId: string,
  comentario?: string
): Promise<ActionResult> {
  const profile = await requireRole("DIRETORIA", "ADMIN");

  const solicitacao = await prisma.solicitacaoCompra.findUnique({
    where: { id },
    include: { fornecedores: true },
  });
  if (!solicitacao || solicitacao.status !== "AGUARDANDO_APROVACAO") {
    return { error: "Esta solicitação não está mais aguardando aprovação." };
  }
  if (!solicitacao.fornecedores.some((f) => f.id === fornecedorAprovadoId)) {
    return { error: "Selecione um fornecedor válido." };
  }

  await transicionar(
    id,
    solicitacao.status,
    "APROVADA",
    profile.id,
    comentario?.trim() || "Solicitação aprovada.",
    {
      aprovadorId: profile.id,
      aprovadoEm: new Date(),
      fornecedorAprovadoId,
    }
  );
  return {};
}

export async function reprovar(id: string, motivo: string): Promise<ActionResult> {
  const profile = await requireRole("DIRETORIA", "ADMIN");
  if (!motivo?.trim()) return { error: "Informe o motivo da reprovação." };

  const solicitacao = await prisma.solicitacaoCompra.findUnique({ where: { id } });
  if (!solicitacao || solicitacao.status !== "AGUARDANDO_APROVACAO") {
    return { error: "Esta solicitação não está mais aguardando aprovação." };
  }

  await transicionar(id, solicitacao.status, "REPROVADA", profile.id, motivo.trim(), {
    aprovadorId: profile.id,
    aprovadoEm: new Date(),
    motivoReprovacao: motivo.trim(),
  });
  return {};
}

export async function concluir(id: string): Promise<ActionResult> {
  const profile = await requireRole("ADMIN");

  const solicitacao = await prisma.solicitacaoCompra.findUnique({ where: { id } });
  if (!solicitacao || solicitacao.status !== "APROVADA") {
    return { error: "Somente solicitações aprovadas podem ser concluídas." };
  }

  await transicionar(id, solicitacao.status, "CONCLUIDA", profile.id, "Compra concluída.");
  return {};
}

export async function cancelar(id: string): Promise<ActionResult> {
  const profile = await requireProfile();

  const solicitacao = await prisma.solicitacaoCompra.findUnique({ where: { id } });
  if (!solicitacao) return { error: "Solicitação não encontrada." };
  if (profile.role === "GESTOR" && solicitacao.requisitanteId !== profile.id) {
    return { error: "Você não pode cancelar esta solicitação." };
  }
  if (!["AGUARDANDO_APROVACAO", "EM_COTACAO"].includes(solicitacao.status)) {
    return { error: "Esta solicitação não pode mais ser cancelada." };
  }

  await transicionar(id, solicitacao.status, "CANCELADA", profile.id, "Solicitação cancelada.");
  return {};
}
