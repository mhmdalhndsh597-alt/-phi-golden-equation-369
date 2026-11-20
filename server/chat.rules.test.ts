import { describe, expect, it } from "vitest";
import { canJoinChatRoom, canModerateChatMember, canWriteToChatRoom } from "./db";

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

  it("limits moderation to owners, moderators, and admins without allowing members to target owners", () => {
    expect(canModerateChatMember("member", "member")).toBe(false);
    expect(canModerateChatMember("moderator", "member")).toBe(true);
    expect(canModerateChatMember("moderator", "moderator")).toBe(false);
    expect(canModerateChatMember("owner", "moderator")).toBe(true);
    expect(canModerateChatMember("owner", "owner")).toBe(false);
    expect(canModerateChatMember("admin", "owner")).toBe(true);
  });
});
