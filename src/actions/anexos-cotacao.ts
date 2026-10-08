"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { ANEXOS_COTACAO_BUCKET } from "@/lib/anexos-cotacao";

type ActionResult<T = undefined> = { error?: string; data?: T };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

// Depois que o bucket existe uma vez, ele nunca deixa de existir — não faz
// sentido checar de novo no Storage a cada anexo enviado. Isso tirava uma
// viagem de rede inteira de cada upload.
let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) return;
  const admin = createAdminClient();
  const { data } = await admin.storage.getBucket(ANEXOS_COTACAO_BUCKET);
  if (!data) {
    await admin.storage.createBucket(ANEXOS_COTACAO_BUCKET, {
      public: false,
      fileSizeLimit: MAX_BYTES,
    });
  }
  bucketReady = true;
}

export async function enviarAnexoCotacao(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();

  const solicitacaoId = formData.get("solicitacaoId");
  const fornecedorOrdemRaw = formData.get("fornecedorOrdem");
  const file = formData.get("arquivo");

  if (
    typeof solicitacaoId !== "string" ||
    typeof fornecedorOrdemRaw !== "string" ||
    !(file instanceof File)
  ) {
    return { error: "Dados inválidos." };
  }
  const fornecedorOrdem = Number(fornecedorOrdemRaw);
  if (!Number.isInteger(fornecedorOrdem) || fornecedorOrdem < 1) {
    return { error: "Dados inválidos." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Envie apenas imagens (JPG, PNG, WEBP ou HEIC)." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Cada imagem deve ter até 5MB." };
  }

  const solicitacao = await prisma.solicitacaoCompra.findUnique({
    where: { id: solicitacaoId },
  });
  if (!solicitacao) return { error: "Solicitação não encontrada." };
  if (solicitacao.status !== "AGUARDANDO_APROVACAO") {
    return { error: "Só é possível anexar prints antes da decisão da diretoria." };
  }
  if (profile.role === "GESTOR" && solicitacao.requisitanteId !== profile.id) {
    return { error: "Você não pode anexar arquivos nesta solicitação." };
  }

  await ensureBucket();

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${solicitacaoId}/${fornecedorOrdem}/${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from(ANEXOS_COTACAO_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadError) return { error: "Falha ao enviar a imagem." };

  await prisma.anexoCotacao.create({
    data: {
      solicitacaoId,
      fornecedorOrdem,
      path,
      nomeArquivo: file.name,
      criadoPorId: profile.id,
    },
  });

  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  return {};
}

export async function removerAnexoCotacao(anexoId: string): Promise<ActionResult> {
  const profile = await requireProfile();

  const anexo = await prisma.anexoCotacao.findUnique({
    where: { id: anexoId },
    include: { solicitacao: true },
  });
  if (!anexo) return { error: "Anexo não encontrado." };
  if (anexo.solicitacao.status !== "AGUARDANDO_APROVACAO") {
    return { error: "Só é possível remover prints antes da decisão da diretoria." };
  }
  if (profile.role === "GESTOR" && anexo.solicitacao.requisitanteId !== profile.id) {
    return { error: "Você não pode remover este arquivo." };
  }

  const admin = createAdminClient();
  await admin.storage.from(ANEXOS_COTACAO_BUCKET).remove([anexo.path]);
  await prisma.anexoCotacao.delete({ where: { id: anexoId } });

  revalidatePath(`/solicitacoes/${anexo.solicitacaoId}`);
  return {};
}
