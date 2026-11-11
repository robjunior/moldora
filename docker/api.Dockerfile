FROM node:20-alpine
WORKDIR /app
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/
COPY prisma ./prisma
RUN npm install --workspaces --include-workspace-root=false || true
COPY . .
WORKDIR /app/apps/api
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/main.ts"]
