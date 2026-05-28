# Ring War Monorepo

Standalone projects — each deploys independently to Vercel.

## Projects

- **ring-war/** — main game (Vite + React)
- **admin/** — admin panel (Vite + React)
- **api-server/** — Express API (Vercel serverless function via `api/index.ts`)

## Local dev

Each folder is self-contained. From inside any folder:

```bash
npm install
npm run dev      # ring-war / admin
npm run build    # production build
```

API server:

```bash
cd api-server
npm install
npm run dev      # tsx watch
npm run build    # tsc -> dist/
npm start
```

## Vercel deployment

For each project, create a separate Vercel project and set:

- **Root Directory**: `ring-war` (or `admin` / `api-server`)
- Build settings come from each folder's `vercel.json`.

No workspace/monorepo configuration required.
