import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// Load .env from monorepo root (../../.env relative to apps/backend/src/config/)
const rootEnvPath = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', '..', '.env');
dotenvConfig({ path: rootEnvPath });
// Also try cwd in case running from root
dotenvConfig({ path: resolve(process.cwd(), '.env') });

const envSchema = z.object({
  // Bilibili
  BILIBILI_COOKIE: z.string().optional().default(''),

  // LLM
  LLM_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default('gpt-4o-mini'),

  // Notification
  WEBHOOK_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  WEBHOOK_SECRET: z.string().optional(),

  // Service
  HTTP_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().default('./data/monitor.db'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
