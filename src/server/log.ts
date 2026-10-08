import { createHash } from "node:crypto";

export type LogMeta = {
  request_id: string;
  route: string;
  status: number;
  latency_ms: number;
  user_hash?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  attempts?: number;
  error_code?: string;
  error_name?: string;
};

export function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

export function logEvent(meta: LogMeta): void {
  console.log(JSON.stringify(meta));
}
