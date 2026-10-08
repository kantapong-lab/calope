import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 4_000_000;
const LONG_EDGE_PX = 1024;

export function detectImageType(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47])) return "png";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

// sharp drops all metadata (EXIF, GPS, ICC) unless asked to keep it.
export function processImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: LONG_EDGE_PX, height: LONG_EDGE_PX, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85 })
    .toBuffer();
}
