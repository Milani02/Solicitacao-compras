-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GESTOR', 'DIRETORIA', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('RASCUNHO', 'AGUARDANDO_APROVACAO', 'EM_COTACAO', 'AGUARDANDO_APROVACAO_FINAL', 'APROVADA', 'REPROVADA', 'CONCLUIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "setorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centros_custo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "setorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "centros_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "id" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_compra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "numero" TEXT NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'RASCUNHO',
    "requisitanteId" UUID NOT NULL,
    "setorId" UUID NOT NULL,
    "centroCustoId" UUID NOT NULL,
    "finalidade" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "aprovadorId" UUID,
    "aprovadoEm" TIMESTAMP(3),
    "motivoReprovacao" TEXT,
    "fornecedorAprovadoId" UUID,
    "enviadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_solicitacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacaoId" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,
    "codigo" TEXT,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "unidade" TEXT NOT NULL,
    "especificacao" TEXT NOT NULL,

    CONSTRAINT "itens_solicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacaoId" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "contato" TEXT,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacoes_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itemId" UUID NOT NULL,
    "fornecedorId" UUID NOT NULL,
    "codMaterial" TEXT,
    "valorCentavos" INTEGER NOT NULL,

    CONSTRAINT "cotacoes_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacaoId" UUID NOT NULL,
    "statusAnterior" "StatusSolicitacao",
    "statusNovo" "StatusSolicitacao" NOT NULL,
    "usuarioId" UUID,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "setores_nome_key" ON "setores"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "centros_custo_setorId_codigo_key" ON "centros_custo"("setorId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_compra_numero_key" ON "solicitacoes_compra"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_compra_fornecedorAprovadoId_key" ON "solicitacoes_compra"("fornecedorAprovadoId");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_solicitacaoId_ordem_key" ON "fornecedores"("solicitacaoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "cotacoes_item_itemId_fornecedorId_key" ON "cotacoes_item"("itemId", "fornecedorId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "setores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_custo" ADD CONSTRAINT "centros_custo_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "setores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_requisitanteId_fkey" FOREIGN KEY ("requisitanteId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "setores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_aprovadorId_fkey" FOREIGN KEY ("aprovadorId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_fornecedorAprovadoId_fkey" FOREIGN KEY ("fornecedorAprovadoId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_solicitacao" ADD CONSTRAINT "itens_solicitacao_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes_item" ADD CONSTRAINT "cotacoes_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "itens_solicitacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes_item" ADD CONSTRAINT "cotacoes_item_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
