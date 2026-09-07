import { describe, expect, it } from "vitest";
import { canJoinChatRoom, canWriteToChatRoom } from "./db";

describe("chat room lifecycle rules", () => {
  it("allows joining only scheduled or live rooms", () => {
    expect(canJoinChatRoom("scheduled")).toBe(true);
    expect(canJoinChatRoom("live")).toBe(true);
    expect(canJoinChatRoom("draft")).toBe(false);
    expect(canJoinChatRoom("closed")).toBe(false);
    expect(canJoinChatRoom("archived")).toBe(false);
  });

  it("allows writing only while a room is live", () => {
    expect(canWriteToChatRoom("live")).toBe(true);
    expect(canWriteToChatRoom("scheduled")).toBe(false);
    expect(canWriteToChatRoom("closed")).toBe(false);
    expect(canWriteToChatRoom("archived")).toBe(false);
  });
});
