# MakerSpace

MakerSpace is a collaborative platform designed for teams to manage projects, tasks, and profiles. Built with a modern tech stack, it provides a seamless experience for team coordination and project tracking.

- Node.js 18+
- A Firebase project for authentication

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kztJames01/makerSpace.git
   cd makerSpace
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. Run the frontend development server:
   ```bash
   npm run dev
   ```

5. Run the Express API server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```


## Monitoring & Testing

### Sentry

Error monitoring is wired for the Next.js frontend and Express API. It stays off until you set a DSN.

1. Create a project at [sentry.io](https://sentry.io)
2. Copy the DSN into `.env`
3. Optional: set `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` for source map uploads on production builds

### Playwright

Smoke tests cover the landing page, sign-in page, auth redirect, and API health check.

```bash
npm run playwright:install   # first time only
npm run db:start             # postgres for the API
npm run test:e2e
```

### CI

GitHub Actions runs lint, frontend build, and Playwright smoke tests on push/PR (`.github/workflows/ci.yml`).

## Security

- Arcjet runs in Next.js middleware and the Express API when `ARCJET_KEY` is set.
- Auth is required on mutating API routes.
- `current-user` fallback is disabled in production.
- Frontend auth cookie refresh runs automatically in the client session.

### Redis-backed rate limiting

- API rate limiting uses Redis when `REDIS_URL` exists.
- It falls back to in-memory only when Redis is missing.

### Docker services

`docker-compose.yml` now runs:

- `web` (Next.js frontend)
- `api` (Express backend)
- `postgres`
- `redis`

Run:

```bash
npm run docker:up
```

### DB migrations

- SQL migrations live in `backend/src/db/migrations`.
- Migration state is tracked in `schema_migrations`.
- Bootstrap now runs migrations first, then optional seed.

Run migrations only:

```bash
npm run backend:migrate
```

### Error handling UI + Sentry capture

- API client no longer returns silent fallback data.
- Request failures throw typed `ApiError`.
- Errors are captured with Sentry in the request layer.
- Query pages show retryable `ApiErrorState` UI.

### Stripe billing

- Backend routes:
  - `POST /api/billing/create-checkout-session`
  - `POST /api/billing/create-portal-session`
  - `GET /api/billing/status`
  - `POST /api/billing/webhook`
- Account and Billing pages now open Stripe Checkout / Billing Portal.
- Webhook events sync subscription state back to local user billing data.

### Real-time messaging

- Socket.IO server is attached to the API service.
- Firebase token auth is enforced on socket connect (strict in production).
- Conversation rooms are used to emit `message:new` events in real time.
- Messages page now subscribes to socket events and refreshes live.

### Backblaze B2 file storage

- Storage route: `POST /api/storage/upload-url` (auth required).
- Uses Backblaze B2 S3-compatible presigned uploads for:
  - `avatars`
  - `projects`
- Account page supports avatar upload.
- Project detail page supports project image upload.

### Required environment variables

See `.env.example` for full keys. New Phase 4 vars include:

- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `APP_URL`
- Backblaze: `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET`, `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_PUBLIC_BASE_URL`

## Mobile App

The `mobile/` folder is an Expo (React Native) app that shares the same backend and Firebase project as the web app. It covers the main screens only: landing, sign in, sign up, and a basic explore feed.

Shared code lives in `shared/` (linked into mobile as the `makerspace-shared` package):

- `shared/authSchema.js` — auth form validation (zod)
- `shared/apiHelpers.js` — API base URL, error parsing, common paths
- `shared/theme.js` — brand colors

Run it:

```bash
cd mobile
npm install
cp .env.example .env   # fill in firebase keys, same project as web
npm start
```

When testing on a real phone, set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` to your computer's LAN IP (e.g. `http://192.168.1.5:4000`) so the phone can reach the backend.


