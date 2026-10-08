import { describe, expect, it } from "vitest";
import { checkFile, fitWithin, MAX_ORIGINAL_BYTES } from "./image";

describe("checkFile (AC-1)", () => {
  it("accepts JPEG, PNG, WebP up to 10 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(checkFile({ type, size: MAX_ORIGINAL_BYTES })).toBeNull();
    }
  });

  it("rejects other types", () => {
    expect(checkFile({ type: "image/heic", size: 1000 })).toBe("INVALID_FILE_TYPE");
    expect(checkFile({ type: "", size: 1000 })).toBe("INVALID_FILE_TYPE");
  });

  it("rejects over 10 MB", () => {
    expect(checkFile({ type: "image/jpeg", size: MAX_ORIGINAL_BYTES + 1 })).toBe("FILE_TOO_LARGE");
  });
});

describe("fitWithin (AC-3)", () => {
  it("shrinks the long edge to 1024 keeping aspect", () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it("never enlarges", () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
});
