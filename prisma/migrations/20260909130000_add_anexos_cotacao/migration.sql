-- CreateTable
CREATE TABLE "anexos_cotacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacaoId" UUID NOT NULL,
    "fornecedorOrdem" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "criadoPorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_cotacao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "anexos_cotacao" ADD CONSTRAINT "anexos_cotacao_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_cotacao" ADD CONSTRAINT "anexos_cotacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RowLevelSecurity (consistente com o restante do schema — acesso só via
-- servidor, nunca direto por client key)
ALTER TABLE "anexos_cotacao" ENABLE ROW LEVEL SECURITY;
