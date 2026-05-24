# ─── Build Stage ────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ─── Production Stage ────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl openssl libc6-compat

COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client and dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# Run migrations then start the service
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
