FROM node:20-slim AS base
WORKDIR /app

# OpenSSL is required by Prisma's query engine at both generate and runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy just what's needed for `npm install` first (better layer caching), and
# crucially include prisma/schema.prisma BEFORE installing — npm install runs
# the "postinstall" script (`prisma generate`), which needs the schema file to
# already be present or it fails immediately.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "run", "start"]