FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter api... --prod=false
COPY apps/api apps/api
RUN pnpm --filter api build
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/src/index.js"]
