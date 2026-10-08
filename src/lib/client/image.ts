export const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 4_000_000;
export const MAX_LONG_EDGE = 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type FileProblem = "INVALID_FILE_TYPE" | "FILE_TOO_LARGE";

export function checkFile(file: { type: string; size: number }): FileProblem | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "INVALID_FILE_TYPE";
  if (file.size > MAX_ORIGINAL_BYTES) return "FILE_TOO_LARGE";
  return null;
}

export function fitWithin(width: number, height: number, maxEdge: number) {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) return { width, height };
  const scale = maxEdge / longEdge;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", quality);
  });
}

// Canvas re-encode drops EXIF/GPS (AC-2); the original file is never sent.
export async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_LONG_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(bitmap, 0, 0, width, height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const blob = await toJpeg(canvas, quality);
      if (blob.size <= MAX_UPLOAD_BYTES) return blob;
    }
    throw new Error("too large after resize");
  } finally {
    bitmap.close();
  }
}
