# DebateMe

Two anonymous users debate in three structured rounds; an AI judge picks the winner.

## Stack
Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui-style components ·
Prisma + PostgreSQL · Socket.io · OpenAI API

## Local setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Copy env file and fill in values
   ```bash
   cp .env.example .env
   ```
3. Start Postgres (or use `docker compose up db`) and run migrations
   ```bash
   npx prisma migrate dev --name init
   ```
4. Run the dev server (custom Next.js + Socket.io server)
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000

## Docker

```bash
docker compose up --build
```

This starts Postgres and the app together. Set `OPENAI_API_KEY` in your shell or a `.env`
file before running — docker-compose reads it from the environment.

## How it works

- **No auth.** Visiting the site creates a temporary anonymous `User` row, cached in
  `localStorage` on the client.
- **Create Debate** creates a `DebateRoom` in `waiting` status with a title and the
  creator's side (FOR/AGAINST).
- **Search Debate** lists all `waiting` rooms; joining assigns the opposite side and
  flips the room to `active` in real time via Socket.io.
- **Rounds.** Each player sends exactly one message per round, 3 rounds total. The
  server (`lib/debate-service.ts`) enforces turn order and round advancement; the
  Socket.io layer (`server/index.ts`) just broadcasts the resulting state.
- **AI judging.** After round 3, the full transcript is sent to OpenAI
  (`lib/openai.ts`), which must return strict JSON with a winner and reason. The
  result is persisted on the `DebateRoom` and broadcast to both clients.
- **History** lists finished debates read-only, including the full transcript by round.

## Project layout

```
app/            Next.js routes (pages + API routes)
components/     UI components (incl. components/ui primitives)
lib/            Prisma client, OpenAI client, debate-service (core logic), utils
server/         Custom server combining Next.js + Socket.io
prisma/         Database schema
types/          Shared TypeScript types (incl. socket event contracts)
hooks/          Client hooks (useLocalUser)
```
# debate-v1
