import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { UsuariosManager } from "./usuarios-manager";

export default async function UsuariosPage() {
  const profile = await requireRole("ADMIN");

  const [usuarios, setores] = await Promise.all([
    prisma.profile.findMany({
      include: { setor: true },
      orderBy: [{ role: "asc" }, { nome: "asc" }],
    }),
    prisma.setor.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Gestores, diretoria e administradores com acesso ao sistema.
        </p>
      </div>

      <UsuariosManager
        currentUserId={profile.id}
        usuarios={usuarios.map((u) => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          role: u.role,
          ativo: u.ativo,
          setorNome: u.setor?.nome ?? null,
        }))}
        setores={setores.map((s) => ({ id: s.id, nome: s.nome }))}
      />
    </div>
  );
}
