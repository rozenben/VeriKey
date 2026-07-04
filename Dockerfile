FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies using root workspace
FROM base AS deps
COPY package.json ./
COPY web/package.json ./web/
# mobile is not needed for the server build
RUN npm install --workspace=web

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY web ./web
RUN cd web && npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/web
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./.next/static
COPY --from=builder /app/web/public ./public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
