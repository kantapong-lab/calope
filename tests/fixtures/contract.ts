// Copied from contract.md C-ERR (status and default Thai text per code). Independent of src/server/errors.ts.
const FILE_LIMIT = "รองรับเฉพาะรูป JPEG, PNG, WebP ขนาดไม่เกิน 10 MB";
const PROVIDER = "วิเคราะห์รูปไม่สำเร็จ กรอกข้อมูลเองได้";

export const CONTRACT_ERRORS: Record<string, { status: number; message_th: string }> = {
  UNAUTHENTICATED: { status: 401, message_th: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
  BAD_ORIGIN: { status: 403, message_th: "คำขอนี้ไม่ได้มาจากแอปของเรา กรุณารีเฟรชหน้าแล้วลองอีกครั้ง" },
  BAD_REQUEST: { status: 400, message_th: "ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง" },
  NOT_FOUND: { status: 404, message_th: "ไม่พบรายการนี้" },
  CONSENT_REQUIRED: { status: 403, message_th: "ต้องให้ความยินยอมก่อนจึงจะวิเคราะห์รูปได้" },
  CONSENT_VERSION_MISMATCH: { status: 409, message_th: "ข้อความความยินยอมมีการอัปเดต กรุณาอ่านและยืนยันอีกครั้ง" },
  INVALID_FILE_TYPE: { status: 400, message_th: FILE_LIMIT },
  // R4 (C-DOCS-RULINGS): states the 4 MB post-resize cap and the 10 MB original limit
  FILE_TOO_LARGE: { status: 413, message_th: "ไฟล์ที่ส่งมาใหญ่เกิน 4 MB หลังย่อรูป กรุณาเลือกรูปอื่น (ต้นฉบับต้องไม่เกิน 10 MB)" },
  RATE_LIMITED: { status: 429, message_th: "วิเคราะห์ครบจำนวนต่อชั่วโมงแล้ว กรุณารอสักครู่" },
  PROVIDER_ERROR: { status: 502, message_th: PROVIDER },
  PROVIDER_INVALID_OUTPUT: { status: 502, message_th: PROVIDER },
  PROVIDER_TIMEOUT: { status: 504, message_th: PROVIDER },
  INTERNAL_ERROR: { status: 500, message_th: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองอีกครั้ง" },
};
