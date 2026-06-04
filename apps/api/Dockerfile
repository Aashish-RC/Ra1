FROM node:22-slim AS dev

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace root files
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

RUN pnpm install --filter @ra1/api...

# Copy the rest of the API source
COPY apps/api/ ./apps/api/

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["pnpm", "dev"]


FROM node:22-slim AS prod

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace root files
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

RUN pnpm install --filter @ra1/api...

COPY apps/api/ ./apps/api/

RUN pnpm --filter @ra1/api build

EXPOSE 3001

USER node

CMD ["node", "dist/index.js"]