import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { uploadVerifiedImage } from "./media";
import { moderateText } from "./moderation";
import { normalizeFeedLimit, validateProfilePatch } from "./db";

function contextFor(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-${userId}`,
      name: "Test User",
      email: "test@example.com",
      loginMethod: "test",
      role: "user",
      bio: null,
      age: 30,
      location: "Cairo",
      gender: "other",
      verificationStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("social safety rules", () => {
  it("rejects sending a gift to yourself before touching the database", async () => {
    const caller = appRouter.createCaller(contextFor(7));
    await expect(caller.gifts.send({
      recipientId: 7,
      giftId: 1,
      commentId: 11,
      idempotencyKey: "self-gift-key-0001",
    })).rejects.toThrow("yourself");
  });

  it("rejects malformed idempotency keys before the wallet transaction", async () => {
    const caller = appRouter.createCaller(contextFor(7));
    await expect(caller.gifts.send({
      recipientId: 8,
      giftId: 1,
      commentId: 11,
      idempotencyKey: "short",
    })).rejects.toThrow("Invalid");
  });

  it("rejects an invalid image payload before storage upload", async () => {
    await expect(uploadVerifiedImage(7, "bm90IGFuIGltYWdl")).rejects.toThrow("valid JPEG");
  });

  it("requires exactly one real comment or message target", async () => {
    const caller = appRouter.createCaller(contextFor(7));
    await expect(caller.gifts.send({
      recipientId: 8,
      giftId: 1,
      commentId: 11,
      messageId: 12,
      idempotencyKey: "both-targets-key-0001",
    })).rejects.toThrow("exactly one");
  });

  it("validates extended profile fields and feed limits", () => {
    expect(() => validateProfilePatch({ age: 17 })).toThrow("between 18 and 90");
    expect(validateProfilePatch({ age: 35 })).toBe(true);
    expect(normalizeFeedLimit(0)).toBe(1);
    expect(normalizeFeedLimit(500)).toBe(100);
    expect(normalizeFeedLimit(12.9)).toBe(12);
  });

  it("rejects unsafe text and accepts normal social text", () => {
    expect(() => moderateText("hello\u0000world", 100, "Post")).toThrow("unsupported");
    expect(() => moderateText("javascript:alert(1)", 100, "Comment")).toThrow("unsupported");
    expect(moderateText("مساء الخير", 100, "Message")).toBe("مساء الخير");
  });

  it("keeps unauthenticated free posting protected", async () => {
    const caller = appRouter.createCaller({
      ...contextFor(1),
      user: null,
    });
    await expect(caller.feed.createPost({ body: "A free post" })).rejects.toThrow();
  });
});
