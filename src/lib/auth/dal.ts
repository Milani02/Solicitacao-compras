import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma";

export const getCurrentProfile = cache(async () => {
  // Nunca confiar num header com o id do usuário: o matcher do proxy pula
  // caminhos terminados em .png/.jpg/etc. (ex: /solicitacoes/x.png casa com
  // [id]), e nesses o header chegaria do cliente sem ser sobrescrito —
  // bastaria forjar x-user-id para agir como qualquer usuário. getClaims()
  // verifica a assinatura do JWT do cookie (localmente, com chaves
  // assimétricas; senão consulta o Auth), então não dá pra forjar.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;

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
