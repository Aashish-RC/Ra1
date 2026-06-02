# ============================================================
# RA1 Canvas - Universal Docker Build
# ============================================================

# --------------- Development Stage ---------------
FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install && npm cache clean --force

COPY . .

EXPOSE 5173

# In dev mode, vite dev server runs with HMR
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]


# --------------- Build Stage ---------------
FROM node:20-alpine AS builder

ARG VITE_API_URL=http://api:3001
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

COPY package*.json ./
RUN npm install && npm cache clean --force

COPY . .
RUN npm run build


# --------------- Production Stage ---------------
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 5173

# In production mode, serve the static build via vite preview
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]