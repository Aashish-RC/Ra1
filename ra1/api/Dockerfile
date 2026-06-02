FROM node:22-slim AS dev

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Only copy the files native to the api folder
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY . .

EXPOSE 3001

CMD ["npx", "tsx", "watch", "src/index.ts"]


FROM node:22-slim AS prod

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Only copy the files native to the api folder
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY . .

RUN pnpm build

EXPOSE 3001

USER node

CMD ["node", "dist/index.js"]