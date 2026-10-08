import "server-only";
import { prisma } from "@/lib/prisma";
import type { StatusSolicitacao, SolicitacaoCompra, Profile, Setor } from "@/generated/prisma";
import { enviarEmail } from "./mailer";
import { emailShell, escapeHtml } from "./templates";

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

type SolicitacaoParaNotificar = SolicitacaoCompra & {
  requisitante: Profile;
  setor: Setor;
};

/** Dispara o e-mail apropriado para a mudança de status de uma solicitação.
 * Nunca lança erro. Recebe a solicitação já carregada (com requisitante e
 * setor) em vez de buscar de novo — quem chama já tem esses dados na mão
 * logo depois do update, e cada busca extra é uma viagem a mais ao banco.
 * Chame sem `await`: e-mail não deve travar a ação do usuário. */
export async function notificarStatus(
  solicitacao: SolicitacaoParaNotificar,
  status: StatusSolicitacao
) {
  try {
    const url = appUrl(`/solicitacoes/${solicitacao.id}`);
    const req = solicitacao.requisitante;

    // Campos preenchidos pelo usuário — escapar antes de interpolar no HTML
    // do e-mail, senão alguém poderia injetar tags/links via um campo do
    // formulário (nome, finalidade, motivo da reprovação etc.).
    const nome = escapeHtml(req.nome);
    const numero = escapeHtml(solicitacao.numero);
    const setorNome = escapeHtml(solicitacao.setor.nome);
    const finalidade = escapeHtml(solicitacao.finalidade);
    const motivoReprovacao = solicitacao.motivoReprovacao
      ? escapeHtml(solicitacao.motivoReprovacao)
      : null;

    switch (status) {
      case "EM_COTACAO": {
        await enviarEmail({
          to: req.email,
          subject: `Solicitação pré-aprovada — ${solicitacao.numero}`,
          html: emailShell({
            title: "Sua solicitação foi pré-aprovada",
            body: `Adicione as cotações de fornecedores para seguir com a aprovação final.`,
            tone: "warning",
            badgeLabel: "Pré-aprovada",
            meta: [{ label: "Número", value: numero }],
            ctaLabel: "Adicionar cotação",
            ctaUrl: url,
          }),
        });
        break;
      }
      case "APROVADA": {
        await enviarEmail({
          to: req.email,
          subject: `✓ Solicitação aprovada — ${solicitacao.numero}`,
          html: emailShell({
            title: "Sua solicitação foi aprovada",
            body: `Boas notícias, <b>${nome}</b>! A Diretoria aprovou sua solicitação e o fornecedor escolhido já está registrado no sistema. Entre no painel para ver os detalhes.`,
            tone: "success",
            badgeLabel: "Aprovada",
            meta: [
              { label: "Número", value: numero },
              { label: "Setor", value: setorNome },
              { label: "Finalidade", value: finalidade },
            ],
            ctaLabel: "Ver no painel",
            ctaUrl: url,
          }),
        });
        break;
      }
      case "REPROVADA": {
        await enviarEmail({
          to: req.email,
          subject: `✕ Solicitação reprovada — ${solicitacao.numero}`,
          html: emailShell({
            title: "Sua solicitação foi reprovada",
            body: `<b>${nome}</b>, a Diretoria reprovou sua solicitação. Entre no painel para ver os detalhes${
              motivoReprovacao ? " e o motivo abaixo" : ""
            }.`,
            tone: "danger",
            badgeLabel: "Reprovada",
            meta: [
              { label: "Número", value: numero },
              { label: "Setor", value: setorNome },
              ...(motivoReprovacao ? [{ label: "Motivo", value: motivoReprovacao }] : []),
            ],
            ctaLabel: "Ver no painel",
            ctaUrl: url,
          }),
        });
        break;
      }
      case "CONCLUIDA": {
        await enviarEmail({
          to: req.email,
          subject: `Compra concluída — ${solicitacao.numero}`,
          html: emailShell({
            title: "Compra concluída",
            body: `A solicitação <b>${numero}</b> foi marcada como concluída pelo time de TI/Compras.`,
            tone: "neutral",
            badgeLabel: "Concluída",
            meta: [{ label: "Número", value: numero }],
            ctaLabel: "Ver detalhes",
            ctaUrl: url,
          }),
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[notificar] Falha ao processar notificação:", err);
  }
}
