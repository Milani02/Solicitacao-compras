import "server-only";
import { formatCentavos } from "@/lib/format";

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

type FornecedorResumo = { nome: string; totalCentavos: number };

/** Dispara o webhook do n8n quando uma solicitação nova chega, pra Diretoria
 * receber o aviso no canal configurado no fluxo (Discord etc). Nunca lança
 * erro — se a URL não estiver configurada, só ignora. Chame sem `await`. */
export async function notificarN8nNovaSolicitacao(params: {
  id: string;
  numero: string;
  requisitanteNome: string;
  setorNome: string;
  finalidade: string;
  justificativa: string;
  fornecedores: FornecedorResumo[];
}) {
  const webhookUrl = process.env.N8N_WEBHOOK_SOLICITACAO_URL;
  if (!webhookUrl) {
    console.log("[n8n] N8N_WEBHOOK_SOLICITACAO_URL não configurada — pulando aviso.");
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero: params.numero,
        requisitante: params.requisitanteNome,
        setor: params.setorNome,
        finalidade: params.finalidade,
        justificativa: params.justificativa,
        fornecedores: params.fornecedores.map((f) => ({
          nome: f.nome,
          total: formatCentavos(f.totalCentavos),
        })),
        url: appUrl(`/solicitacoes/${params.id}`),
      }),
    });
  } catch (err) {
    console.error("[n8n] Falha ao chamar webhook:", err);
  }
}
