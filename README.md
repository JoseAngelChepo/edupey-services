# EduPey Services

API NestJS de EduPey (`/api/v1`): auth, usuarios, sesiones y campañas educativas.

Contexto: [docs/edupey/PRODUCT_CONTEXT.md](docs/edupey/PRODUCT_CONTEXT.md) · Plan: [MVP](docs/edupey/MVP.md) · Setup: [SETUP](docs/edupey/SETUP.md).

Frontend hermano: [edupey-platform](https://github.com/JoseAngelChepo/edupey-platform).

Son donaciones organizadas como crowdfunding educativo: sin rendimiento financiero, participación ni préstamo para el donante.

## Modules

| Module | Purpose |
|--------|---------|
| `auth` | Register, login, refresh, logout, Google OAuth, password reset, `GET /auth/me` |
| `users` | Perfil y admin de usuarios |
| `sessions` | Refresh tokens |
| `campaigns` | Catálogo, detalle, seguimiento y publicación (admin) |
| `emails` | Email transaccional (Resend, opcional) |
| `user-api-tokens` | PATs por usuario |
| `common` | `RolesGuard`, decorators |

## Quick start

```bash
npm run setup-env
# Editar .env — MONGODB_URI y secretos (nunca subir .env)
npm ci
npm run dev
```

Puerto por defecto: **3001**. Seed demo (no producción): `npm run seed:demo`.

## Environment

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Firmas de tokens |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Vidas de token |
| `FRONTEND_URL` / `CORS_ORIGIN` | Origen del frontend |
| `GOOGLE_*` | OAuth opcional |
| `RESEND_*` / `EMAIL_FROM` | Email opcional |
| `PORT` | Default `3001` |

Ver [`.env.example`](./.env.example). **Nunca** subir `.env` ni `.env.local`.

## Security

1. `npm run setup-env` genera secretos locales; no uses los placeholders en producción.
2. MongoDB dedicado; no compartas credenciales en issues públicos.
3. Antes de push: `git status` no debe listar `.env`.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run seed:demo
npm run audit:security
```

## Docs

| Topic | File |
|-------|------|
| Producto EduPey | [`docs/edupey/`](./docs/edupey/) |
| API routes | [`docs/README.md`](./docs/README.md) |
| Modules | [`docs/MODULES.md`](./docs/MODULES.md) |
| Guards | [`docs/GUARDS.md`](./docs/GUARDS.md) |
