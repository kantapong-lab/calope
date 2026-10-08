import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectImageType, processImage } from "./image";

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#c08040" } });

describe("detectImageType", () => {
  it("detects JPEG, PNG and WebP by magic bytes", async () => {
    expect(detectImageType(await solid(8, 8).jpeg().toBuffer())).toBe("jpeg");
    expect(detectImageType(await solid(8, 8).png().toBuffer())).toBe("png");
    expect(detectImageType(await solid(8, 8).webp().toBuffer())).toBe("webp");
  });

  it("rejects GIF, PDF, text and empty input regardless of any declared type", () => {
    expect(detectImageType(Buffer.from("GIF89a....."))).toBeNull();
    expect(detectImageType(Buffer.from("%PDF-1.7"))).toBeNull();
    expect(detectImageType(Buffer.from("hello world"))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });

  it("rejects a RIFF container that is not WebP", () => {
    expect(detectImageType(Buffer.from("RIFF\0\0\0\0WAVEfmt "))).toBeNull();
  });
});

describe("processImage", () => {
  it("re-encodes as JPEG with the long edge at most 1024 px, keeping aspect ratio", async () => {
    const out = await processImage(await solid(2000, 1500).jpeg().toBuffer());
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(768);
  });

  it("never enlarges a small image", async () => {
    const meta = await sharp(await processImage(await solid(300, 200).png().toBuffer())).metadata();
    expect([meta.width, meta.height]).toEqual([300, 200]);
  });

  it("drops EXIF, including the device and copyright tags", async () => {
    const withExif = await solid(400, 300)
      .withExif({ IFD0: { Copyright: "EXIF-MARKER-COPYRIGHT", Make: "EXIF-MARKER-MAKE" } })
      .jpeg()
      .toBuffer();
    expect(withExif.includes("EXIF-MARKER-COPYRIGHT")).toBe(true);

    const out = await processImage(withExif);
    expect((await sharp(out).metadata()).exif).toBeUndefined();
    expect(out.includes("EXIF-MARKER")).toBe(false);
  });

  it("applies the EXIF orientation before dropping it", async () => {
    const rotated = await solid(400, 200).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const meta = await sharp(await processImage(rotated)).metadata();
    expect([meta.width, meta.height]).toEqual([200, 400]);
    expect(meta.orientation).toBeUndefined();
  });

  it("rejects an input above the 40 megapixel limit before decoding it", async () => {
    const huge = await solid(8000, 5200).png({ compressionLevel: 9 }).toBuffer();
    expect(huge.length).toBeLessThan(1_000_000);
    await expect(processImage(huge)).rejects.toThrow(/pixel/i);
  });

  it("rejects bytes that have image magic but cannot be decoded", async () => {
    await expect(processImage(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]))).rejects.toThrow();
  });
});
