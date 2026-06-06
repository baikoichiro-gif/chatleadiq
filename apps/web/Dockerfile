FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter web... --prod=false
COPY apps/web apps/web
RUN pnpm --filter web build
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
