# TennisLeaguePWA

Open-source web app for managing recreational tennis leagues.

## Stack

- Laravel 12
- Inertia.js + React
- Vite + Tailwind CSS
- SQLite (default database)

## Local Setup

1. Install PHP 8.2+ and Composer
2. Install Node.js 18+
3. Copy environment file and generate key

```bash
cp .env.example .env
php artisan key:generate
```

PowerShell:

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

4. Create SQLite database and run migrations

```bash
mkdir -p database
type NUL > database/database.sqlite
php artisan migrate
```

PowerShell:

```powershell
if (-not (Test-Path database)) { New-Item -ItemType Directory database | Out-Null }
if (-not (Test-Path database\database.sqlite)) { New-Item -ItemType File database\database.sqlite | Out-Null }
php artisan migrate
```

5. Install JS dependencies and run dev server

```bash
npm install
npm run dev
```

6. Start the Laravel server

```bash
php artisan serve
```

## Docs

Project documentation is in [docs/](docs/). Start with [docs/00-overview.md](docs/00-overview.md).
