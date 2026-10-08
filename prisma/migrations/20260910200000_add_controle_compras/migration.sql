-- AlterTable: permissão independente do role, dá acesso à tela de Controle
-- de Compras sem trocar o papel principal da pessoa.
ALTER TABLE "profiles" ADD COLUMN "controleCompras" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: preenchidos pelo Controle de Compras depois da aprovação.
ALTER TABLE "solicitacoes_compra" ADD COLUMN "notaFiscal" TEXT;
ALTER TABLE "solicitacoes_compra" ADD COLUMN "observacoes" TEXT;
