import { randomUUID } from "node:crypto";

export function generateExternalId(kind: "deposit" | "withdraw"): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `showcase-${kind}-${timestamp}-${randomUUID().slice(0, 8)}`;
}
