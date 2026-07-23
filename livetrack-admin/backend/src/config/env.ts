import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});
export const env = schema.parse(process.env);
export const allowedOrigins = (env.ALLOWED_ORIGINS ?? env.CLIENT_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
