import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { SetoresManager } from "./setores-manager";

export default async function SetoresPage() {
  await requireRole("ADMIN");

  const setores = await prisma.setor.findMany({
    include: {
      centrosCusto: { orderBy: { codigo: "asc" } },
      _count: { select: { usuarios: true, solicitacoes: true } },
    },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">Setores</h1>
        <p className="text-sm text-muted-foreground">
          Setores e centros de custo usados nas solicitações de compra.
        </p>
      </div>

      <SetoresManager
        setores={setores.map((s) => ({
          id: s.id,
          nome: s.nome,
          totalUsuarios: s._count.usuarios,
          totalSolicitacoes: s._count.solicitacoes,
          centrosCusto: s.centrosCusto.map((c) => ({
            id: c.id,
            codigo: c.codigo,
            descricao: c.descricao,
          })),
        }))}
      />
    </div>
  );
}
