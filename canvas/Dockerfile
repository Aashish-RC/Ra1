FROM node:20-alpine AS builder
WORKDIR /app

# Copy and build shared package first
COPY packages/shared /packages/shared
WORKDIR /packages/shared
RUN npm install && npm run build

# Now build canvas
WORKDIR /app
COPY apps/canvas/package*.json ./
RUN npm install && npm cache clean --force
COPY apps/canvas/ .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 5173
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]