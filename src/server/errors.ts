import type { ApiErrorBody, ErrorCode } from "../shared/api-types";

type ErrorSpec = {
  status: number;
  message_th: string;
  retryable: boolean;
  fallback?: "manual";
};

const FILE_LIMIT_TH = "รองรับเฉพาะรูป JPEG, PNG, WebP ขนาดไม่เกิน 10 MB";
const PROVIDER_TH = "วิเคราะห์รูปไม่สำเร็จ กรอกข้อมูลเองได้";

export const ERROR_SPECS: Record<ErrorCode, ErrorSpec> = {
  UNAUTHENTICATED: { status: 401, message_th: "กรุณาเข้าสู่ระบบก่อนใช้งาน", retryable: false },
  BAD_ORIGIN: {
    status: 403,
    message_th: "คำขอนี้ไม่ได้มาจากแอปของเรา กรุณารีเฟรชหน้าแล้วลองอีกครั้ง",
    retryable: false,
  },
  BAD_REQUEST: {
    status: 400,
    message_th: "ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง",
    retryable: false,
  },
  NOT_FOUND: { status: 404, message_th: "ไม่พบรายการนี้", retryable: false },
  CONSENT_REQUIRED: {
    status: 403,
    message_th: "ต้องให้ความยินยอมก่อนจึงจะวิเคราะห์รูปได้",
    retryable: false,
  },
  CONSENT_VERSION_MISMATCH: {
    status: 409,
    message_th: "ข้อความความยินยอมมีการอัปเดต กรุณาอ่านและยืนยันอีกครั้ง",
    retryable: false,
  },
  INVALID_FILE_TYPE: { status: 400, message_th: FILE_LIMIT_TH, retryable: false },
  FILE_TOO_LARGE: { status: 413, message_th: FILE_LIMIT_TH, retryable: false },
  RATE_LIMITED: {
    status: 429,
    message_th: "วิเคราะห์ครบจำนวนต่อชั่วโมงแล้ว กรุณารอสักครู่",
    retryable: false,
  },
  PROVIDER_ERROR: { status: 502, message_th: PROVIDER_TH, retryable: true, fallback: "manual" },
  PROVIDER_TIMEOUT: { status: 504, message_th: PROVIDER_TH, retryable: true, fallback: "manual" },
  PROVIDER_INVALID_OUTPUT: {
    status: 502,
    message_th: PROVIDER_TH,
    retryable: false,
    fallback: "manual",
  },
  INTERNAL_ERROR: {
    status: 500,
    message_th: "เกิดข้อผิดพลาดของระบบ กรุณาลองอีกครั้งในภายหลัง",
    retryable: true,
  },
};

export type ErrorExtras = {
  details?: { path: string; code: string }[];
  required_version?: string;
  retryAfterSec?: number;
};

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly extras: ErrorExtras = {},
  ) {
    super(code);
  }
}

export function errorResponse(code: ErrorCode, extras: ErrorExtras = {}): Response {
  const spec = ERROR_SPECS[code];
  const body: ApiErrorBody = {
    error: {
      code,
      message_th: spec.message_th,
      retryable: spec.retryable,
      ...(spec.fallback && { fallback: spec.fallback }),
      ...(extras.details && { details: extras.details }),
      ...(extras.required_version && { required_version: extras.required_version }),
    },
  };
  const headers: Record<string, string> = {};
  if (extras.retryAfterSec !== undefined) headers["Retry-After"] = String(extras.retryAfterSec);
  return Response.json(body, { status: spec.status, headers });
}

export function zodDetails(error: {
  issues: { path: PropertyKey[]; code: string }[];
}): { path: string; code: string }[] {
  return error.issues.map((i) => ({ path: i.path.map(String).join("."), code: i.code }));
}
