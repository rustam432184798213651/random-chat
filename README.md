# Random Chat

Anonymous random 1:1 chat built with Next.js, NestJS, Socket.IO, Prisma and SQLite.

## Stack

- Frontend: Next.js + React + TypeScript
- Backend: NestJS + Socket.IO + TypeScript
- ORM: Prisma
- DB now: SQLite
- DB later: PostgreSQL

## Local start

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:3000 in two browser tabs/windows and press **Start Chat** in both.

## App URLs

- Web: http://localhost:3000
- API: http://localhost:4000

## Moving from SQLite to PostgreSQL later

In `apps/api/prisma/schema.prisma` change:

```prisma
provider = "sqlite"
```

to:

```prisma
provider = "postgresql"
```

Then set `DATABASE_URL` to a PostgreSQL URL, for example:

```env
DATABASE_URL="postgresql://user:password@host:5432/random_chat?schema=public"
```

After that run:

```bash
npm run db:migrate
```

## Important production notes

This MVP stores active matchmaking state in backend memory. This is fine for one backend instance. If you run multiple backend instances, add Redis and Socket.IO Redis adapter.

For public launch, add moderation, rate limits, reporting, abuse prevention, and privacy/legal pages.
