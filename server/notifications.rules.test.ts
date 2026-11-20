import { describe, expect, it } from "vitest";
import { isRealUserNotification } from "./db";

describe("real user notifications", () => {
  it("rejects self, invalid, and empty notifications", () => {
    expect(isRealUserNotification({ recipientId: 5, actorId: 5, message: "أعجب بمنشورك" })).toBe(false);
    expect(isRealUserNotification({ recipientId: 0, actorId: 5, message: "أعجب بمنشورك" })).toBe(false);
    expect(isRealUserNotification({ recipientId: 5, actorId: 6, message: "" })).toBe(false);
  });

  it("accepts a notification caused by another authenticated actor", () => {
    expect(isRealUserNotification({ recipientId: 5, actorId: 6, message: "أضاف عضو تعليقًا على منشورك" })).toBe(true);
  });
});
