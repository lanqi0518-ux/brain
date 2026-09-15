FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=optional --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_WC_PROJECT_ID
ARG NEXT_PUBLIC_STONK_TOKEN
ARG NEXT_PUBLIC_POINTS
ARG NEXT_PUBLIC_HOOK
ARG NEXT_PUBLIC_BRIDGE
ARG NEXT_PUBLIC_SESSION
ARG NEXT_PUBLIC_MARGIN
ARG NEXT_PUBLIC_ADAPTER
ARG NEXT_PUBLIC_PAYMASTER
ARG NEXT_PUBLIC_USDG
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
