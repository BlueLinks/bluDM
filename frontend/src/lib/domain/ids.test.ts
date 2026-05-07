import { describe, expect, it, vi } from "vitest";
import { createId } from "./ids";

describe("createId", () => {
  it("falls back when randomUUID is unavailable", () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: undefined, randomUUID: undefined });
    const id = createId("fallback");
    expect(id.startsWith("fallback-")).toBe(true);
    vi.stubGlobal("crypto", originalCrypto);
  });
});
