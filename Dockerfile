# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

# --- deps: instala todas as dependências (inclui dev, necessárias pro build) ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# --- deps-prod: só dependências de produção, para rodar a CLI do Prisma em
# runtime (migrate deploy). A árvore de deps dela (@prisma/config -> effect,
# c12, etc.) é funda demais pra copiar pacote por pacote de forma confiável. ---
FROM base AS deps-prod
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# --- builder: gera o Prisma Client e builda o Next.js ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# DATABASE_URL não é necessária para `prisma generate` (só metadados do schema),
# nem para `next build` (nenhuma página faz acesso a banco em build time).
RUN npx prisma generate
RUN npm run build

# --- runner: imagem final, mínima, só com o necessário para rodar ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Saída standalone do Next.js: server.js + node_modules mínimos já traçados.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# CLI do Prisma completa (com toda a árvore de deps de @prisma/config) +
# schema/migrations, para rodar `migrate deploy` no start. Mescla sobre o
# node_modules traçado do standalone acima, sem substituí-lo.
# Chamamos build/index.js diretamente (não via node_modules/.bin/prisma):
# esse é um symlink no Linux, e um COPY avulso dele entre estágios o desfaz,
# copiando o conteúdo do alvo para um arquivo comum em .bin/ — o
# require('./cli.js') relativo lá dentro passa a apontar pro lugar errado.
COPY --from=deps-prod --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Aplica migrations pendentes contra o Postgres de produção e sobe o servidor.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
