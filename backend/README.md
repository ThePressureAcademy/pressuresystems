# LIFTIQ Pilot Backend + Console

Express + SQLite backend that powers the LIFTIQ Phase 1 pilot, plus the
dispatcher-facing console SPA at `/console/`.

## Local development

```bash
cp .env.example .env          # then edit JWT_SECRET, SEED_ADMIN_PASSWORD
npm install
npm run seed                  # creates the company + admin user
npm test                      # 66 tests, all pass
npm start                     # http://localhost:3001
```

Open `http://localhost:3001/` and sign in with the seeded credentials.

## Manual dispatcher smoke test

Use this after seeding a pilot admin account and starting the backend.

1. Sign in at `/console/`.
2. Create a worker.
3. Add at least one credential to that worker.
4. Add a fatigue / shift record for that worker.
5. Create a job with the credential requirement needed for SmartRank.
6. Run SmartRank and confirm the console shows ranked, warned, and blocked workers.
7. Attempt a hard-blocked allocation and confirm the console shows the backend `422` rejection without showing success.
8. Attempt a warning or lower-ranked allocation and confirm the console requires `override_reason`.
9. Confirm a valid allocation and verify the allocation snapshot renders.
10. Open Audit log and confirm it is read-only, filterable, and shows the recorded event trail.
11. Open Pilot metrics and confirm the allocation, blocks, warnings, overrides, and audit totals changed.

## Pilot security note

- The default seeded admin credentials are for internal smoke tests only.
- Rotate the pilot admin password from the console before any real pilot data or partner access.
- The backend supports minimal authenticated password rotation via `PATCH /api/users/:id`; this console exposes that narrow action without adding full user-management scope.

## Run with Docker locally

```bash
docker build -t liftiq-pilot .
docker run --rm -p 3001:3001 \
  -v "$(pwd)/data:/data" \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  liftiq-pilot
```

Then seed the admin user inside the running container (one-time):

```bash
docker exec -it $(docker ps -q --filter ancestor=liftiq-pilot) \
  sh -c 'SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=changeme node src/seed.js'
```

## Deploy to Fly.io (recommended)

Fly.io is the cleanest target for this app — SQLite + a 1 GB persistent
volume on the free tier, single machine, automatic HTTPS.

### One-time setup

```bash
brew install flyctl                          # or curl -L https://fly.io/install.sh | sh
fly auth login

cd backend
fly launch --no-deploy --copy-config         # accept fly.toml as-is, or pick a new name
fly volumes create liftiq_data --size 1 --region syd
fly secrets set \
  JWT_SECRET="$(openssl rand -hex 32)" \
  ADMIN_TOKEN="$(openssl rand -hex 32)"
```

### Deploy

```bash
fly deploy
```

### Seed the first admin user

```bash
fly ssh console
# inside the machine:
SEED_ADMIN_EMAIL=you@example.com \
SEED_ADMIN_PASSWORD='strong-password-here' \
SEED_COMPANY_NAME='Your Crane Co.' \
node src/seed.js
exit
```

The console will then be live at `https://<your-app>.fly.dev/`.

### Verify

```bash
curl https://<your-app>.fly.dev/api/health
# {"status":"ok","service":"liftiq-backend","version":"0.1.0"}
```

## Deploy to Render (alternative)

Render works too, but the persistent disk costs $1/mo (free tier has no
disk). Use the same `Dockerfile`. Steps:

1. New → Web Service → connect this repo, root directory `backend`.
2. Runtime: Docker. Render auto-detects the `Dockerfile`.
3. Add a Disk:
   - Name: `liftiq-data`
   - Mount path: `/data`
   - Size: 1 GB
4. Environment variables: `JWT_SECRET`, `ADMIN_TOKEN`, `NODE_ENV=production`.
5. Deploy.
6. Use Render's Shell to run `node src/seed.js` once with the seed env vars.

## Operational notes

- **SQLite is single-machine.** Fly.io's `auto_stop_machines = "stop"`
  keeps the app cheap; the WAL file is preserved on the volume across
  restarts. Do not scale horizontally without migrating to Postgres.
- **Backups:** `fly ssh console -C 'sqlite3 /data/liftiq.db ".backup /data/liftiq.bak"'`
  then `fly sftp get /data/liftiq.bak`.
- **Audit log is append-only** at the database level (triggers in
  `src/schema.sql`). Even an admin with shell access cannot tamper
  through normal SQL.
- **Rotating credentials:** `fly secrets set JWT_SECRET=...` invalidates
  all existing tokens. Users will need to log in again.
- **First-login password:** the seed flow uses a known password.
  Always rotate it via the API immediately after first login.

## Cost expectations

- Fly.io: free tier covers 3 × shared-cpu-1x machines and 3 GB volumes.
  Typical idle cost for one pilot: $0/mo. With light traffic: < $5/mo.
- Render: ~$1/mo for the disk; web service free if it sleeps, $7/mo for
  always-on.
