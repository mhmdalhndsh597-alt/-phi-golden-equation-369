import { describe, expect, it } from "vitest";
import { calculateCompatibility } from "./compatibility";
import { isSyntheticAccount, validateChatGiftRoomState, validateGiftContext, validateProfilePatch } from "./db";

describe("compatibility and gift context rules", () => {
  it("marks official and demo accounts as synthetic", () => {
    expect(isSyntheticAccount("official")).toBe(true);
    expect(isSyntheticAccount("demo")).toBe(true);
    expect(isSyntheticAccount("member")).toBe(false);
  });

  it("returns an explainable percentage from shared preferences", () => {
    const result = calculateCompatibility(
      { age: 30, location: "القاهرة", interests: "قراءة, سفر", skills: "تصميم", maritalStatus: "single", preferredAgeMin: 25, preferredAgeMax: 35 },
      { age: 29, location: "القاهرة", interests: "قراءة, سفر", skills: "تصميم", maritalStatus: "single", preferredAgeMin: 25, preferredAgeMax: 35 },
    );
    expect(result.percentage).toBeGreaterThanOrEqual(90);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("enforces profile preference age bounds", () => {
    expect(() => validateProfilePatch({ preferredAgeMin: 17 })).toThrow();
    expect(() => validateProfilePatch({ preferredAgeMax: 91 })).toThrow();
    expect(() => validateProfilePatch({ preferredAgeMin: 40, preferredAgeMax: 30 })).toThrow();
    expect(validateProfilePatch({ preferredAgeMin: 25, preferredAgeMax: 40 })).toBe(true);
  });

  it("enforces live-room gift rules for direct room-message gifts", () => {
    expect(validateChatGiftRoomState("live", true, true)).toBe(true);
    expect(() => validateChatGiftRoomState("closed", true, true)).toThrow("live room");
    expect(() => validateChatGiftRoomState("archived", true, true)).toThrow("live room");
    expect(() => validateChatGiftRoomState("live", false, true)).toThrow("live room");
    expect(() => validateChatGiftRoomState("live", true, false)).toThrow("room member");
  });

  it("requires exactly one gift context and a room for room messages", () => {
    expect(() => validateGiftContext({})).toThrow();
    expect(() => validateGiftContext({ commentId: 1, messageId: 2 })).toThrow();
    expect(() => validateGiftContext({ chatMessageId: 8 })).toThrow();
    expect(validateGiftContext({ chatRoomId: 3, chatMessageId: 8 })).toBe(true);
    expect(validateGiftContext({ messageId: 4 })).toBe(true);
  });
});
