import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { signedUrlsForAnexos } from "@/lib/anexos-cotacao";
import { computeSolicitacaoFlags } from "@/lib/solicitacoes/permissions";
import { DetailContent, type AnexoPorOrdem } from "./detail-content";

export default async function SolicitacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [profile, solicitacao] = await Promise.all([
    requireProfile(),
    prisma.solicitacaoCompra.findUnique({
      where: { id },
      include: {
        requisitante: true,
        aprovador: true,
        setor: true,
        centroCusto: true,
        itens: { orderBy: { ordem: "asc" } },
        fornecedores: {
          orderBy: { ordem: "asc" },
          include: { cotacoes: true },
        },
        fornecedorAprovado: true,
        anexosCotacao: { orderBy: { createdAt: "asc" } },
        historico: {
          orderBy: { createdAt: "asc" },
          include: { usuario: true },
        },
      },
    }),
  ]);

  if (!solicitacao) notFound();

  const anexosUrls = await signedUrlsForAnexos(
    solicitacao.anexosCotacao.map((a) => a.path)
  );
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

  // Controle de Compras enxerga o detalhe completo de qualquer solicitação
  // aprovada (é o propósito da tela) mesmo com role GESTOR — só o dono do
  // pedido ou quem tem essa permissão passa da trava abaixo.
  if (
    profile.role === "GESTOR" &&
    !profile.controleCompras &&
    solicitacao.requisitanteId !== profile.id
  ) {
    notFound();
  }

  const flags = computeSolicitacaoFlags(profile, solicitacao);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-data text-2xl font-semibold tracking-tight">
            {solicitacao.numero}
          </h1>
          <StatusBadge status={solicitacao.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {solicitacao.setor.nome} · {solicitacao.centroCusto.codigo} —{" "}
          {solicitacao.centroCusto.descricao}
        </p>
      </div>

      <DetailContent solicitacao={solicitacao} flags={flags} anexosPorOrdem={anexosPorOrdem} />
    </div>
  );
}
