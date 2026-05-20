## syntax=docker/dockerfile:1

# --- deps ---
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# --- build ---
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- production ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
  && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
