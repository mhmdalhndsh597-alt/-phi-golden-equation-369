import { describe, expect, it } from "vitest";
import { getGiftStoreState } from "./giftStoreState";

describe("GiftStore UI states", () => {
  it("shows loading before catalog data exists", () => {
    expect(getGiftStoreState({ loading: true, error: false, giftCount: 0 })).toBe("loading");
  });

  it("shows error without inventing catalog items", () => {
    expect(getGiftStoreState({ loading: false, error: true, giftCount: 0 })).toBe("error");
  });

  it("shows empty when the real catalog is empty", () => {
    expect(getGiftStoreState({ loading: false, error: false, giftCount: 0 })).toBe("empty");
  });

  it("shows gifts only when real catalog rows exist", () => {
    expect(getGiftStoreState({ loading: false, error: false, giftCount: 8 })).toBe("ready");
  });
});
