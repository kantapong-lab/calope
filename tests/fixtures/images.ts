import sharp from "sharp";

export const EXIF_MARKER = "QA-EXIF-MARKER-4242";

// JPEG carrying EXIF text tags (and orientation) that must not survive upload (AC-2).
export async function jpegWithExif(width = 2000, height = 1500, orientation?: number): Promise<Buffer> {
  const base = await sharp({ create: { width, height, channels: 3, background: "#aa8844" } })
    .withExif({ IFD0: { Copyright: EXIF_MARKER, Make: EXIF_MARKER } })
    .jpeg()
    .toBuffer();
  // withMetadata({orientation}) writes the EXIF Orientation tag while keeping the marker tags.
  return orientation ? sharp(base).withMetadata({ orientation }).jpeg().toBuffer() : base;
}

export const png = (width = 600, height = 400) =>
  sharp({ create: { width, height, channels: 4, background: { r: 200, g: 100, b: 50, alpha: 0.5 } } }).png().toBuffer();

export const webp = (width = 1600, height = 900) =>
  sharp({ create: { width, height, channels: 3, background: "#44aa88" } }).webp().toBuffer();

// Valid JPEG magic bytes followed by garbage: passes the type sniff, fails to decode.
export const corruptJpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("not really an image ".repeat(50))]);

export const gif = () => Buffer.from("GIF89a" + "x".repeat(200), "latin1");
export const textFile = () => Buffer.from("hello, not an image");
