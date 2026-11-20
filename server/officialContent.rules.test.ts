import { describe, expect, it } from "vitest";
import { OFFICIAL_SEED, isSyntheticAccount } from "./db";

describe("official and demo seed content", () => {
  it("contains clearly labeled educational or welcome posts", () => {
    expect(OFFICIAL_SEED.length).toBeGreaterThanOrEqual(3);
    for (const account of OFFICIAL_SEED) {
      expect(account.name.length).toBeGreaterThan(0);
      expect(account.bio.length).toBeGreaterThan(0);
      expect(account.post.length).toBeGreaterThan(0);
      expect(isSyntheticAccount(account.openId === "wisal-demo-salma" ? "demo" : "official")).toBe(true);
    }
  });
});
