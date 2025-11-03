# qrdisplay — Next.js multi-tenant starter

This project was initialized with Next.js 14 (App Router), TypeScript, and Tailwind.
It includes:

- Prisma (SQLite) with a basic multi-tenant schema (User, Organization, Membership, Project).
- Clerk (authentication) installed as a dependency (integration not yet wired).
- shadcn UI initialized (use `npx shadcn add <component>` to add components).
- Basic folder structure for a multi-tenant SaaS app under `app/`.

Quick start:

```bash
# install (already done by the initializer)
npm install

# run dev
npm run dev
```

Next steps:

- Wire Clerk in `app/layout.tsx` for authentication.
- Add UI components via `npx shadcn add`.
- Replace SQLite with Postgres for production and update `prisma/schema.prisma` and `.env`.
