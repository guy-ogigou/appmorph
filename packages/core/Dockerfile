# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json tsconfig.base.json ./

# Copy package sources
COPY packages/shared ./packages/shared
COPY packages/core ./packages/core

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build all packages
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm for workspace resolution
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy built packages
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/core/dist ./packages/core/dist

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run the server
CMD ["node", "packages/core/dist/index.js"]
