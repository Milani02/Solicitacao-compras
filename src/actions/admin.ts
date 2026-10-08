"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { randomBytes } from "node:crypto";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult<T = undefined> = { error?: string; data?: T };

function gerarSenhaTemporaria() {
  return randomBytes(9).toString("base64url") + "!A1";
}

const CriarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, { error: "Informe o nome completo." }),
  email: z.email({ error: "Informe um e-mail válido." }),
  role: z.enum(["GESTOR", "DIRETORIA", "ADMIN"]),
  setorId: z.string().optional(),
});

export async function criarUsuario(
  input: z.infer<typeof CriarUsuarioSchema>
): Promise<ActionResult<{ senha: string }>> {
  await requireRole("ADMIN");

  const parsed = CriarUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  if (data.role === "GESTOR" && !data.setorId) {
    return { error: "Selecione o setor do gestor." };
  }

  const existente = await prisma.profile.findUnique({ where: { email: data.email } });
  if (existente) return { error: "Já existe um usuário com este e-mail." };

  const senha = gerarSenhaTemporaria();
  const supabaseAdmin = createAdminClient();

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: senha,
    email_confirm: true,
  });

  if (error || !created.user) {
    return { error: error?.message ?? "Falha ao criar usuário." };
  }

  try {
    await prisma.profile.create({
      data: {
        id: created.user.id,
        nome: data.nome,
        email: data.email,
        role: data.role,
        setorId: data.role === "GESTOR" ? data.setorId : null,
      },
    });
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    throw err;
  }

  revalidatePath("/admin/usuarios");
  return { data: { senha } };
}

export async function alternarAtivoUsuario(
  id: string,
  ativo: boolean
): Promise<ActionResult> {
  const profile = await requireRole("ADMIN");
  if (profile.id === id && !ativo) {
    return { error: "Você não pode desativar seu próprio usuário." };
  }

  await prisma.profile.update({ where: { id }, data: { ativo } });
  revalidatePath("/admin/usuarios");
  return {};
}

export async function resetarSenhaUsuario(
  id: string
): Promise<ActionResult<{ senha: string }>> {
  await requireRole("ADMIN");

  const senha = gerarSenhaTemporaria();
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    password: senha,
  });

  if (error) return { error: error.message };
  return { data: { senha } };
}

const AtualizarCredenciaisSchema = z.object({
  id: z.string(),
  email: z.email({ error: "Informe um e-mail válido." }),
  novaSenha: z
    .union([z.string().min(6, { error: "A senha deve ter pelo menos 6 caracteres." }), z.literal("")])
    .optional(),
});

export async function atualizarCredenciaisUsuario(
  input: z.infer<typeof AtualizarCredenciaisSchema>
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = AtualizarCredenciaisSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, email, novaSenha } = parsed.data;

  const atual = await prisma.profile.findUnique({ where: { id } });
  if (!atual) return { error: "Usuário não encontrado." };

  const emailMudou = email !== atual.email;
  if (emailMudou) {
    const existente = await prisma.profile.findUnique({ where: { email } });
    if (existente) return { error: "Já existe um usuário com este e-mail." };
  }

  const supabaseAdmin = createAdminClient();
  const authUpdates: { email?: string; password?: string; email_confirm?: boolean } = {};
  if (emailMudou) {
    authUpdates.email = email;
    authUpdates.email_confirm = true;
  }
  if (novaSenha) authUpdates.password = novaSenha;

  if (Object.keys(authUpdates).length > 0) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
    if (error) return { error: error.message };
  }

  if (emailMudou) {
    await prisma.profile.update({ where: { id }, data: { email } });
  }

  revalidatePath("/admin/usuarios");
  return {};
}

const CriarSetorSchema = z.object({
  nome: z.string().trim().min(2, { error: "Informe o nome do setor." }),
});

export async function criarSetor(input: { nome: string }): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = CriarSetorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existente = await prisma.setor.findUnique({ where: { nome: parsed.data.nome } });
  if (existente) return { error: "Já existe um setor com este nome." };

  await prisma.setor.create({ data: { nome: parsed.data.nome } });
  revalidatePath("/admin/setores");
  return {};
}

export async function excluirSetor(id: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  try {
    await prisma.setor.delete({ where: { id } });
  } catch {
    return {
      error: "Não é possível excluir: existem usuários, centros de custo ou solicitações vinculados a este setor.",
    };
  }
  revalidatePath("/admin/setores");
  return {};
}

const CriarCentroCustoSchema = z.object({
  setorId: z.uuid(),
  codigo: z.string().trim().min(1, { error: "Informe o código." }),
  descricao: z.string().trim().min(1, { error: "Informe a descrição." }),
});

export async function criarCentroCusto(
  input: z.infer<typeof CriarCentroCustoSchema>
): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = CriarCentroCustoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existente = await prisma.centroCusto.findUnique({
    where: { setorId_codigo: { setorId: parsed.data.setorId, codigo: parsed.data.codigo } },
  });
  if (existente) return { error: "Já existe um centro de custo com este código neste setor." };

  await prisma.centroCusto.create({ data: parsed.data });
  revalidatePath("/admin/setores");
  return {};
}

export async function excluirCentroCusto(id: string): Promise<ActionResult> {
  await requireRole("ADMIN");
  try {
    await prisma.centroCusto.delete({ where: { id } });
  } catch {
    return { error: "Não é possível excluir: existem solicitações vinculadas a este centro de custo." };
  }
  revalidatePath("/admin/setores");
  return {};
}
