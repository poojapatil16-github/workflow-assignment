#!/bin/sh
set -e

log() {
  printf '%s\n' "[entrypoint] $*"
}

wait_for_database() {
  log "Waiting for PostgreSQL to accept connections..."
  node --input-type=module <<'NODE'
import pg from 'pg';

const maxAttempts = Number(process.env.DB_WAIT_MAX_ATTEMPTS ?? 30);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS ?? 2000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[entrypoint] DATABASE_URL is not set');
  process.exit(1);
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    console.log('[entrypoint] Database is ready');
    process.exit(0);
  } catch (error) {
    try {
      await client.end();
    } catch {
      // ignore cleanup errors while waiting
    }
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      `[entrypoint] Database not ready (attempt ${attempt}/${maxAttempts}): ${message}`,
    );
    if (attempt === maxAttempts) {
      console.error('[entrypoint] Database did not become ready in time');
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
NODE
}

run_migrations() {
  log "Running Prisma migrations (prisma migrate deploy)..."
  if npx prisma migrate deploy; then
    log "Migrations completed successfully"
  else
    log "ERROR: Prisma migrate deploy failed"
    exit 1
  fi
}

run_seed() {
  log "Running Prisma seed (prisma db seed)..."
  if npx prisma db seed; then
    log "Seed completed successfully"
    return 0
  fi

  seed_status=$?
  log "WARN: Prisma seed exited with code ${seed_status} (continuing — data may already exist)"
  return 0
}

wait_for_database
run_migrations
run_seed

log "Starting application..."
exec node dist/server.js