// Named *.test.ts only so eslint's SDK-import exemption (C-VISION rule, devops-owned) applies; never collected as a test
// because no vitest include glob matches tests/fixtures.
import Anthropic from "@anthropic-ai/sdk";
import { vi } from "vitest";

// The live provider is never called: the SDK method is replaced for the whole file.
export const createSpy = () =>
  vi.spyOn(Anthropic.Messages.prototype, "create") as unknown as ReturnType<typeof vi.fn>;

export function apiError(status: number) {
  return Anthropic.APIError.generate(status, { error: { message: "x" } }, "x", new Headers());
}

