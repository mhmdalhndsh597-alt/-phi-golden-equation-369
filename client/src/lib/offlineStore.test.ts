import { beforeEach, describe, expect, it } from "vitest";
import { cacheFeed, clearOfflineData, getCachedFeed, getConnectionState, getDraft, getSavedItems, listQueuedActions, offlineLimits, queueAction, removeQueuedAction, saveDraft, saveItem, setConnectionState } from "./offlineStore";

describe("offline store", () => {
  beforeEach(async () => {
    await clearOfflineData();
  });

  it("caches feed items and enforces the feed limit", async () => {
    await cacheFeed(Array.from({ length: offlineLimits.feedItems + 5 }, (_, id) => ({ id })));
    const feed = await getCachedFeed<{ id: number }>();
    expect(feed).toHaveLength(offlineLimits.feedItems);
    expect(feed[0]).toEqual({ id: 0 });
  });

  it("saves and replaces a draft without persisting sensitive data", async () => {
    await saveDraft({ kind: "comment", body: "  تعليق محفوظ  ", attachmentName: "secret.jpg" });
    await saveDraft({ kind: "comment", body: "نسخة أحدث" });
    const draft = await getDraft("comment");
    expect(draft?.body).toBe("نسخة أحدث");
    expect(draft?.attachmentName).toBeUndefined();
  });

  it("queues and removes free actions in chronological order", async () => {
    const first = await queueAction({ kind: "like", payload: { postId: 1 } });
    await queueAction({ kind: "comment", payload: { postId: 1, body: "مرحبًا" } });
    const queued = await listQueuedActions();
    expect(queued.map((item) => item.kind)).toEqual(["like", "comment"]);
    await removeQueuedAction(first.id);
    expect((await listQueuedActions()).map((item) => item.kind)).toEqual(["comment"]);
  });

  it("stores saved feed items and the last connection state", async () => {
    await saveItem({ kind: "post", referenceId: 42, label: "منشور محفوظ" });
    expect((await getSavedItems())[0]).toMatchObject({ kind: "post", referenceId: 42 });
    await setConnectionState({ online: false, lastChangedAt: 10, pendingCount: 2 });
    expect(await getConnectionState()).toMatchObject({ online: false, pendingCount: 2 });
  });
});
