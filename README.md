# MSE_433_Project

Catan Location Recommender monorepo with:

- `apps/frontend`: JavaScript React + Vite frontend
- `apps/backend`: Python FastAPI backend API
- `packages/shared`: shared TypeScript types

## Setup

```bash
pnpm install
python -m pip install -r apps/backend/requirements.txt
```

## Run all apps in dev mode

```bash
pnpm dev
```

- Frontend: `http://localhost:5173`
- Backend health endpoint: `http://localhost:3000/health`

## Build

```bash
pnpm build
```

## Environment variables

- Frontend (`apps/frontend/.env`):
	- `VITE_API_URL=http://localhost:3000`
- Backend:
	- `PORT=3000`
	- `FRONTEND_ORIGIN=http://localhost:5173`

## Backend only (optional)

```bash
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 3000 --app-dir apps/backend
```
