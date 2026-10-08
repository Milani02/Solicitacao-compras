# Solicitação de Compras — Biodinâmica

Sistema interno de solicitação de compras e serviços. Substitui o formulário em
papel (`docs/FB7.05-08...pdf`) por um fluxo digital: **Gestor de setor** cria a
solicitação → **Diretoria** pré-aprova → Gestor cadastra cotações de até 3
fornecedores → Diretoria escolhe o fornecedor e aprova → **Admin (TI)** marca
como concluída. Cada mudança de status fica registrada no histórico e dispara
e-mail para os envolvidos.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind + shadcn/ui
- Supabase: Postgres (via Prisma 7, driver adapter `@prisma/adapter-pg`) + Auth
- Nodemailer para e-mails transacionais
- Docker (saída `standalone`) para deploy no Coolify

## Rodando localmente

1. Copie `.env.example` para `.env.local` e preencha com os dados do projeto
   Supabase (Settings → API e Settings → Database) e, opcionalmente, SMTP.
2. Instale as dependências:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Aplique as migrations no banco:
   ```bash
   npx prisma migrate deploy
   ```
4. Rode o seed (cria o usuário admin e dois setores de exemplo — a senha
   temporária do admin é impressa no terminal, guarde-a):
   ```bash
   npx prisma db seed
   ```
5. Suba o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

> **Nota sobre migrations:** este projeto usa `prisma migrate deploy` (não
> `migrate dev`) porque uma das migrations cria uma foreign key para
> `auth.users`, schema gerenciado pelo Supabase que não existe no shadow
> database que o `migrate dev` cria para validar diffs.

## Variáveis de ambiente

Veja `.env.example` para a lista completa. As essenciais:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (segredo — só server-side) |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Seu provedor de e-mail (ex: Office 365, Gmail, SES) |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação (usada nos links dos e-mails) |

Sem SMTP configurado, os e-mails são apenas logados no console — o sistema
continua funcionando normalmente.

## Deploy no Coolify

1. Crie uma nova aplicação no Coolify apontando para este repositório. O
   Coolify detecta o `Dockerfile` automaticamente (build pack "Dockerfile").
2. Configure todas as variáveis de ambiente da tabela acima na aplicação.
3. Porta exposta pelo container: `3000`.
4. No primeiro deploy, o próprio container roda `prisma migrate deploy`
   automaticamente antes de subir o servidor (ver `CMD` no `Dockerfile`), então
   não é necessário rodar migrations manualmente.
5. Para criar o usuário administrador inicial em produção, rode uma vez, via
   terminal do Coolify (aba "Terminal" do container ou `docker exec`):
   ```bash
   node -e "require('child_process').execSync('npx prisma db seed', {stdio:'inherit'})"
   ```
   Isso só funciona se `SUPABASE_SERVICE_ROLE_KEY` e `DATABASE_URL` estiverem
   configuradas. Guarde a senha temporária impressa no log.

### Build local do Docker (opcional, para testar antes do deploy)

```bash
docker build -t solicitacao-compras .
docker run --env-file .env.local -p 3000:3000 solicitacao-compras
```

## Papéis do sistema

- **Gestor de setor**: cria solicitações do próprio setor, cadastra cotações.
- **Diretoria**: pré-aprova, aprova/reprova a cotação final.
- **Admin (TI)**: gerencia usuários e setores/centros de custo, conclui compras
  aprovadas, e tem visão total do sistema.

Usuários são criados exclusivamente pelo Admin em **Usuários** — não há
autocadastro. Uma senha temporária é gerada na criação e deve ser repassada ao
usuário.
