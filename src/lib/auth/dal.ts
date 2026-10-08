import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma";

export const getCurrentProfile = cache(async () => {
  // O proxy já revalidou a sessão com o servidor do Supabase Auth e repassa
  // o id do usuário por header — evita repetir esse round-trip de rede em
  // toda navegação/action. Só cai para getUser() se o header não existir
  // (fora do fluxo normal de middleware).
  let userId = (await headers()).get("x-user-id");

  if (!userId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: { setor: true },
  });

  return profile;
});

/** Garante sessão válida e perfil ativo. Redireciona para /login caso contrário. */
export async function requireProfile() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.ativo) {
    // Sem isso, a sessão do Supabase Auth continua válida mesmo com o
    // perfil desativado: o proxy vê usuário autenticado e manda embora de
    // /login, essa função manda de volta pra /login — loop infinito de
    // redirect. Encerrando a sessão aqui, o proxy para de interferir.
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return profile;
}

/** Garante sessão válida e um dos papéis informados. Redireciona para "/" se não autorizado. */
export async function requireRole(...roles: Role[]) {
  const profile = await requireProfile();

  if (!roles.includes(profile.role)) {
    redirect("/");
  }

  return profile;
}

/** Garante acesso à tela de Controle de Compras — permissão independente
 * do role (ex: a Raquel é DIRETORIA e também tem essa tela). Redireciona
 * para "/" se a pessoa não tiver essa permissão marcada. */
export async function requireControleCompras() {
  const profile = await requireProfile();

  if (!profile.controleCompras) {
    redirect("/");
  }

  return profile;
}
