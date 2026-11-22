# Producao em uma unica porta: a API Nest serve o front e as imagens .avif.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm install
COPY . .
RUN npm run prisma:generate -w @archblueprint/api && npm run build

FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
ENV NODE_ENV=production DATABASE_URL="file:/data/app.db" WEB_DIST="../web/dist" PORT=3000
VOLUME /data
WORKDIR /app/apps/api
# cria/atualiza as tabelas a partir do schema; popula o banco so na primeira vez
CMD ["sh", "-c", "npx prisma db push --skip-generate && (test -s /data/.seeded || (npx prisma db seed && touch /data/.seeded)) && node dist/main.js"]
