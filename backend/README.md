# Quran App - Backend

Express + TypeScript + MongoDB (Mongoose) API for the Quran web app. Built to the hamaki-backend standard: one service class per endpoint (`use()`), one controller per endpoint (`handle`), response DTO classes, constructor DI composed in the route files, Joi validation, JWT auth with a session (`jti`) check, and a Jest spec for every piece of logic.

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then set JWT_SECRET to a long random string
docker compose up -d        # MongoDB on localhost:27017 (local dev)
npm run dev                 # http://localhost:4000
```

Swagger UI: http://localhost:4000/api/docs

## Environment

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `MONGO_URI` | yes | - | e.g. `mongodb://localhost:27017/quran_app`. App exits at startup if missing |
| `JWT_SECRET` | yes | - | App exits at startup if missing. No fallback secret |
| `JWT_EXPIRES_IN` | no | `24h` | Any `jsonwebtoken` expiry string |
| `PORT` | no | `4000` | |
| `CORS_ORIGINS` | no | none | Comma-separated browser origins allowed to call the API |
| `NODE_ENV` | no | `development` | |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Run with auto-reload (ts-node-dev) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm test` | Jest (no database needed) |
| `npm run test:coverage` | Jest with coverage |
| `npm run typecheck` | `tsc --noEmit` |

## Endpoints

All under `/api`. Success: `{ "success": true, "data": ... }`. Failure: `{ "success": false, "error": { "code", "message", "details?" } }`. Authenticated routes need `Authorization: Bearer <token>`.

| Method | Path | Auth | Body | Notes |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | public | | Liveness |
| POST | `/api/auth/register` | public | `{ name, email, password }` | 201, returns `{ token, expiresIn, user }`. 409 if email exists |
| POST | `/api/auth/login` | public | `{ email, password }` | Returns `{ token, expiresIn, user }` |
| POST | `/api/auth/logout` | yes | | Revokes the current session |
| GET | `/api/auth/me` | yes | | Current user |
| GET | `/api/bookmarks` | yes | | Current user's bookmarks, newest first |
| POST | `/api/bookmarks` | yes | `{ surah 1-114, ayah >=1, note? }` | 201. 409 on duplicate user+surah+ayah |
| DELETE | `/api/bookmarks/:id` | yes | | 404 if not yours or missing |
| GET | `/api/progress` | yes | | `{ surah: null, ayah: null, updatedAt: null }` if none saved |
| PUT | `/api/progress` | yes | `{ surah, ayah }` | Upsert |
| GET | `/api/preferences` | yes | | Defaults if none saved |
| PUT | `/api/preferences` | yes | any of `lang ('ar'/'en'), reciter, tafsirId, speed 0.5-2, fontSize 16-72, showTranslation, continuous` | Upsert, partial update, at least one field |

Register and login are rate limited (20 requests per 15 minutes per IP).

## Structure

```
src/
  config/       env (fail fast), database, swagger
  constants/    AUTH, ERROR_CODES, QURAN, preferences defaults
  enums/        UserRole, Language
  errors/       AppError + NotFound / Validation / Authentication / Forbidden / Conflict / RateLimit
  interfaces/   IService, auth contracts, entity shapes, service inputs
  models/       Mongoose schemas
  dtos/         response DTO classes + request DTO types, per resource
  validation/   Joi schemas, per resource
  traits/       BcryptPasswordHasher, JwtTokenService, SessionIssuer (shared by login and register)
  middleware/   auth (authenticate/authorize), validation, errorHandler, rateLimit
  services/     <resource>/<action><Resource>.service.ts   (class with use())
  controllers/  <resource>/<action><Resource>.controller.ts (class with arrow handle)
  routes/       <resource>.route.ts (composition root + @openapi docs), index.ts
  app.ts, server.ts
spec/           mirrors src/
```

## Adding an endpoint

1. Interface for the input (and entity if new) in `interfaces/`.
2. Response DTO (and request DTO type) in `dtos/<resource>/`.
3. Joi schema in `validation/<resource>/<action><Resource>.validation.ts`.
4. Service `services/<resource>/<action><Resource>.service.ts` implementing `IService` with `use()`; models and traits come in through the constructor. Data scoping (own rows only) goes here, using the authenticated user passed in as input.
5. Controller `controllers/<resource>/<action><Resource>.controller.ts` with an arrow `handle`.
6. A line in `routes/<resource>.route.ts` (`authenticate` -> `validate` -> `controller.handle`) with an `@openapi` block.
7. Specs for the service, controller and validation schema in `spec/`.
8. Check: `npx tsc --noEmit && npx jest`.
