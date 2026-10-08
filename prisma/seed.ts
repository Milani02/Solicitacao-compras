import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function generateTempPassword() {
  return randomBytes(9).toString("base64url") + "!A1";
}

async function ensureAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "ti@biodinamica.com.br";

  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin já existe: ${email}`);
    return;
  }

  const tempPassword = generateTempPassword();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário admin no Supabase Auth: ${error?.message}`);
  }

  await prisma.profile.create({
    data: {
      id: data.user.id,
      nome: "TI - Administrador",
      email,
      role: "ADMIN",
      ativo: true,
    },
  });

  console.log("\n=== Usuário administrador criado ===");
  console.log(`E-mail:  ${email}`);
  console.log(`Senha:   ${tempPassword}`);
  console.log("Troque essa senha assim que fizer o primeiro login.\n");
}

async function ensureSetoresDemo() {
  const count = await prisma.setor.count();
  if (count > 0) {
    console.log("Setores já existem, pulando seed de exemplo.");
    return;
  }

  await prisma.setor.create({
    data: {
      nome: "Tecnologia da Informação",
      centrosCusto: {
        create: [{ codigo: "CC-TI-01", descricao: "TI - Geral" }],
      },
    },
  });

  await prisma.setor.create({
    data: {
      nome: "Produção",
      centrosCusto: {
        create: [{ codigo: "CC-PROD-01", descricao: "Produção - Geral" }],
      },
    },
  });

  console.log("Setores de exemplo criados (Tecnologia da Informação, Produção).");
}

async function main() {
  await ensureAdminUser();
  await ensureSetoresDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
