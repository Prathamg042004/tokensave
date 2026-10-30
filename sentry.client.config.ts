import * as Sentry from "@sentry/nextjs";
import { redactEvent } from "./app/lib/telemetry.mjs";

Sentry.init({
  sendDefaultPii: false,
  beforeSend: redactEvent,
  beforeSendTransaction: redactEvent,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  environment: process.env.NODE_ENV,
});