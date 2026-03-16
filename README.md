# TennisLeaguePWA

Open-source Progressive Web App for managing recreational tennis leagues.

## Stack

- React 19
- React Router
- Firebase Authentication
- Firebase Firestore (offline-capable)
- Vite
- Tailwind CSS

## Requirements

- Node.js 18+
- npm 9+
- Firebase project (Firestore + Authentication enabled)

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Fill Firebase environment variables in `.env`

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- Optional: `VITE_USE_FIREBASE_EMULATOR=true` for local emulator usage

4. Start development server

```bash
npm run dev
```

App runs at `http://localhost:5173` by default.

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - build production bundle
- `npm run preview` - preview production build locally
- `npm run format` - check Prettier formatting
- `npm run format:fix` - auto-fix formatting with Prettier

## Project Structure

```text
app/
	css/
		app.css
	js/
		app.jsx
		main.jsx
		config/
			firebase.config.js
		features/
			auth/
			dashboard/
			home/
			profile/
		lib/
			firestore.js
			utils.js
		shared/
			components/
			hooks/
```

## Firebase Notes

- Authentication and Firestore are initialized in `app/js/config/firebase.config.js`.
- Firestore uses persistent local cache when available.
- If persistence is unavailable, app falls back to in-memory Firestore.

## Deployment

- Frontend build output is generated in `dist/`.
- You can deploy to Vercel, Firebase Hosting, Netlify, or any static host.
- If using Firebase rules/deployment, see docs below.

## Documentation

Project documentation is in [docs/](docs/). Start with:

- [docs/00-overview.md](docs/00-overview.md)
- [docs/07-firebase-schema.md](docs/07-firebase-schema.md)
- [docs/08-firebase-deployment.md](docs/08-firebase-deployment.md)
- [docs/09-google-auth-setup.md](docs/09-google-auth-setup.md)
