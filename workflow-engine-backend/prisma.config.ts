import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * URL for Prisma CLI (migrate, db pull, etc.). Falls back to a syntactically valid placeholder so
 * `prisma generate` can run in environments where only the schema is needed (e.g. CI image build).
 * Point `DATABASE_URL` at a real database before running migrations.
 */
const datasourceUrl =
  process.env.DATABASE_URL ?? 'postgresql://127.0.0.1:5432/postgres?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --import tsx prisma/seed.ts',
  },
  datasource: {
    url: datasourceUrl,
  },
});
