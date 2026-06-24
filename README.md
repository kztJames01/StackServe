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

## 📄 License

This project is licensed under the MIT License.
