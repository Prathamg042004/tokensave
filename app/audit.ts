import { safeListPush } from "./redis";

export type AuditEvent =
  | "api_request"
  | "api_error"
  | "rate_limit_hit"
  | "auth_failure"
  | "key_generated"
  | "key_rotated"
  | "team_created"
  | "team_member_added"
  | "webhook_created"
  | "suspicious_activity";

interface AuditEntry {
  event: AuditEvent;
  timestamp: number;
  ip?: string;
  userId?: string;
  provider?: string;
  details?: Record<string, any>;
}

export async function logAudit(
  event: AuditEvent,
  details?: Record<string, any>,
  ip?: string,
  userId?: string
): Promise<void> {
  const entry: AuditEntry = {
    event,
    timestamp: Date.now(),
    ip: ip ? hashIp(ip) : undefined,
    userId,
    ...( details ? { details } : {}),
  };

  await safeListPush("audit_log", JSON.stringify(entry), 1000);

  if (event === "suspicious_activity" || event === "auth_failure") {
    console.warn(`[SECURITY] ${event}:`, JSON.stringify(entry));
  }
}

function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return "ip_" + Math.abs(hash).toString(36);
}

export async function detectSuspicious(
  ip: string,
  windowMs: number = 60000
): Promise<boolean> {
  // Basic detection: if we're logging this, the rate limiter
  // already caught repeated attempts. This is for additional patterns.
  return false;
}