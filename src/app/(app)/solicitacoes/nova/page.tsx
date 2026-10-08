import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { NovaSolicitacaoForm } from "./form";

export default async function NovaSolicitacaoPage() {
  const profile = await requireRole("GESTOR");

  if (!profile.setorId || !profile.setor) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Empty className="max-w-md border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangle />
            </EmptyMedia>
            <EmptyTitle>Nenhum setor vinculado</EmptyTitle>
            <EmptyDescription>
              Seu usuário ainda não está vinculado a um setor. Peça para o
              administrador (TI) configurar isso antes de criar solicitações.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // O gestor pode escolher o centro de custo de qualquer setor (não só o
  // próprio) — a solicitação continua pertencendo ao setor do gestor, só a
  // lista de centros de custo fica aberta pra ele encaixar no que fizer
  // sentido pra compra.
  const centrosCusto = await prisma.centroCusto.findMany({
    orderBy: { codigo: "asc" },
  });

  if (centrosCusto.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Empty className="max-w-md border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangle />
            </EmptyMedia>
            <EmptyTitle>Nenhum centro de custo cadastrado</EmptyTitle>
            <EmptyDescription>
              Ainda não há centros de custo cadastrados. Peça para o
              administrador (TI) cadastrar antes de criar solicitações.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
              Voltar ao painel
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Nova solicitação de compra
        </h1>
        <p className="text-sm text-muted-foreground">
          Setor: {profile.setor.nome}
        </p>
      </div>

      <NovaSolicitacaoForm
        setorId={profile.setorId}
        centrosCusto={centrosCusto.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          descricao: c.descricao,
        }))}
      />
    </div>
  );
}
