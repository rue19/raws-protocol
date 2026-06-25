import pino from "pino";
import { config } from "../config";

const redactPaths = [
  "KEEPER_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "req.headers.authorization",
  "req.headers.cookie",
];

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: { paths: redactPaths, censor: "[REDACTED]" },
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});