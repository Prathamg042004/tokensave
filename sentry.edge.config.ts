import * as Sentry from "@sentry/nextjs";
import { redactEvent } from "./app/lib/telemetry.mjs";

Sentry.init({
  sendDefaultPii: false,
  beforeSend: redactEvent,
  beforeSendTransaction: redactEvent,
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});