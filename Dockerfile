# FROM oven/bun:latest AS base
# WORKDIR /app

# FROM base AS deps
# COPY package*.json ./
# RUN bun install

# FROM base AS runner
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .

# ENV NODE_ENV=production
# EXPOSE 3000

# CMD ["bun", "run", "start"]

FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN bun install

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

ENV NODE_ENV=production
EXPOSE 4000

CMD ["bun", "run", "start"]