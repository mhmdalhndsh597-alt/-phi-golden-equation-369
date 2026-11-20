const DB_NAME = "phi-golden-equation-offline";
const DB_VERSION = 1;
const KV_STORE = "kv";
const ACTION_STORE = "actions";
const FEED_KEY = "feed-cache";
const SAVED_KEY = "saved-items";
const CONNECTION_KEY = "connection-state";
const DRAFT_LIMIT = 40;
const ACTION_LIMIT = 100;
const FEED_LIMIT = 80;

type DraftKind = "post" | "comment" | "message" | "chat-message";
export type OfflineDraft = {
  key: string;
  kind: DraftKind;
  body: string;
  attachmentName?: string;
  syncPending?: boolean;
  updatedAt: number;
};

export type OfflineActionKind = "like" | "comment" | "message" | "chat-message";
export type OfflineAction = {
  id: string;
  kind: OfflineActionKind;
  payload: Record<string, unknown>;
  createdAt: number;
};
export type SavedOfflineItem = { id: string; kind: "post" | "profile"; referenceId: number; label?: string; savedAt: number };
export type OfflineConnectionState = { online: boolean; lastChangedAt: number; lastSyncedAt?: number; pendingCount: number };

const memoryKv = new Map<string, unknown>();
const memoryDrafts = new Map<string, OfflineDraft>();
const memoryActions = new Map<string, OfflineAction>();

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function notifyOfflineChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("zawaj-offline-change"));
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(ACTION_STORE)) {
        const store = db.createObjectStore(ACTION_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function runStore<T>(storeName: string, mode: IDBTransactionMode, work: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void, fallback: () => T): Promise<T> {
  const db = await openDb();
  if (!db) return fallback();
  return new Promise<T>((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, mode);
      work(transaction.objectStore(storeName), resolve, reject);
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline storage transaction aborted"));
      transaction.onerror = () => reject(transaction.error ?? new Error("Offline storage transaction failed"));
    } catch {
      resolve(fallback());
    }
  }).finally(() => db.close());
}

function draftKey(kind: DraftKind) {
  return `draft:${kind}`;
}

export async function cacheFeed<T>(feed: T[]) {
  const safeFeed = feed.slice(0, FEED_LIMIT);
  memoryKv.set(FEED_KEY, safeFeed);
  await runStore<void>(KV_STORE, "readwrite", (store, resolve) => {
    const request = store.put({ key: FEED_KEY, value: safeFeed, updatedAt: Date.now() });
    request.onsuccess = () => resolve(undefined);
  }, () => undefined);
  notifyOfflineChange();
}

export async function getCachedFeed<T>(): Promise<T[]> {
  const memoryValue = memoryKv.get(FEED_KEY);
  const fallback = () => (Array.isArray(memoryValue) ? memoryValue as T[] : []);
  return runStore<T[]>(KV_STORE, "readonly", (store, resolve) => {
    const request = store.get(FEED_KEY);
    request.onsuccess = () => {
      const value = request.result?.value;
      resolve(Array.isArray(value) ? value as T[] : fallback());
    };
  }, fallback);
}

export async function saveDraft(input: { kind: DraftKind; body: string; attachmentName?: string; syncPending?: boolean }) {
  const draft: OfflineDraft = {
    key: draftKey(input.kind),
    kind: input.kind,
    body: input.body.slice(0, 10_000),
    attachmentName: input.attachmentName?.slice(0, 160),
    syncPending: input.syncPending ?? false,
    updatedAt: Date.now(),
  };
  memoryDrafts.set(draft.key, draft);
  await runStore<void>(KV_STORE, "readwrite", (store, resolve) => {
    const request = store.put(draft);
    request.onsuccess = () => resolve(undefined);
  }, () => undefined);
  await trimKeyedEntries("draft:", DRAFT_LIMIT);
  notifyOfflineChange();
}

export async function getDraft(kind: DraftKind): Promise<OfflineDraft | undefined> {
  const fallback = () => memoryDrafts.get(draftKey(kind));
  return runStore<OfflineDraft | undefined>(KV_STORE, "readonly", (store, resolve) => {
    const request = store.get(draftKey(kind));
    request.onsuccess = () => resolve(request.result as OfflineDraft | undefined ?? fallback());
  }, fallback);
}

export async function listDrafts(): Promise<OfflineDraft[]> {
  const fallback = () => Array.from(memoryDrafts.values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, DRAFT_LIMIT);
  return runStore<OfflineDraft[]>(KV_STORE, "readonly", (store, resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as OfflineDraft[]).filter((item) => item?.key?.startsWith("draft:")).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, DRAFT_LIMIT));
  }, fallback);
}

export async function removeDraft(kind: DraftKind) {
  const key = draftKey(kind);
  memoryDrafts.delete(key);
  await runStore<void>(KV_STORE, "readwrite", (store, resolve) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve(undefined);
  }, () => undefined);
  notifyOfflineChange();
}

export async function queueAction(input: { kind: OfflineActionKind; payload: Record<string, unknown> }) {
  const action: OfflineAction = { id: `${input.kind}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, kind: input.kind, payload: input.payload, createdAt: Date.now() };
  memoryActions.set(action.id, action);
  await runStore<void>(ACTION_STORE, "readwrite", (store, resolve) => {
    const request = store.put(action);
    request.onsuccess = () => resolve(undefined);
  }, () => undefined);
  await trimActions();
  notifyOfflineChange();
  return action;
}

export async function listQueuedActions(): Promise<OfflineAction[]> {
  const fallback = () => Array.from(memoryActions.values()).sort((a, b) => a.createdAt - b.createdAt).slice(0, ACTION_LIMIT);
  return runStore<OfflineAction[]>(ACTION_STORE, "readonly", (store, resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as OfflineAction[]).sort((a, b) => a.createdAt - b.createdAt).slice(0, ACTION_LIMIT));
  }, fallback);
}

export async function removeQueuedAction(id: string) {
  memoryActions.delete(id);
  await runStore<void>(ACTION_STORE, "readwrite", (store, resolve) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(undefined);
  }, () => undefined);
  notifyOfflineChange();
}

async function trimKeyedEntries(prefix: string, max: number) {
  await runStore<void>(KV_STORE, "readwrite", (store, resolve) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const entries = request.result.filter((entry) => typeof entry.key === "string" && entry.key.startsWith(prefix)).sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0));
      for (const entry of entries.slice(max)) store.delete(entry.key);
      resolve(undefined);
    };
  }, () => undefined);
}

async function trimActions() {
  await runStore<void>(ACTION_STORE, "readwrite", (store, resolve) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const entries = (request.result as OfflineAction[]).sort((a, b) => b.createdAt - a.createdAt);
      for (const entry of entries.slice(ACTION_LIMIT)) store.delete(entry.id);
      resolve(undefined);
    };
  }, () => undefined);
}

export async function getSavedItems(): Promise<SavedOfflineItem[]> {
  const fallback = () => (memoryKv.get(SAVED_KEY) as SavedOfflineItem[] | undefined) ?? [];
  return runStore<SavedOfflineItem[]>(KV_STORE, "readonly", (store, resolve) => {
    const request = store.get(SAVED_KEY);
    request.onsuccess = () => resolve((request.result?.value as SavedOfflineItem[] | undefined) ?? fallback());
  }, fallback);
}

export async function saveItem(item: Omit<SavedOfflineItem, "id" | "savedAt">) {
  const current = await getSavedItems();
  const next = [{ ...item, id: `${item.kind}:${item.referenceId}`, savedAt: Date.now() }, ...current.filter((saved) => saved.id !== `${item.kind}:${item.referenceId}`)].slice(0, FEED_LIMIT);
  memoryKv.set(SAVED_KEY, next);
  await runStore<void>(KV_STORE, "readwrite", (store, resolve) => {
    const request = store.put({ key: SAVED_KEY, value: next, updatedAt: Date.now() });
    request.onsuccess = () => resolve(undefined);
  }, () => undefined);
  notifyOfflineChange();
}

export async function removeSavedItem(kind: SavedOfflineItem["kind"], referenceId: number) {
  const next = (await getSavedItems()).filter((item) => item.id !== `${kind}:${referenceId}`);
  memoryKv.set(SAVED_KEY, next);
  await runStore<void>(KV_STORE, "readwrite", (store, resolve) => {
    const request = store.put({ key: SAVED_KEY, value: next, updatedAt: Date.now() });
    request.onsuccess = () => resolve(undefined);
  }, () => undefined);
  notifyOfflineChange();
}

export async function setConnectionState(state: OfflineConnectionState) {
  memoryKv.set(CONNECTION_KEY, state);
  await runStore<void>(KV_STORE, "readwrite", (store, resolve) => {
    const request = store.put({ key: CONNECTION_KEY, value: state, updatedAt: Date.now() });
    request.onsuccess = () => resolve(undefined);
  }, () => undefined);
}

export async function getConnectionState(): Promise<OfflineConnectionState | undefined> {
  const fallback = () => memoryKv.get(CONNECTION_KEY) as OfflineConnectionState | undefined;
  return runStore<OfflineConnectionState | undefined>(KV_STORE, "readonly", (store, resolve) => {
    const request = store.get(CONNECTION_KEY);
    request.onsuccess = () => resolve(request.result?.value as OfflineConnectionState | undefined ?? fallback());
  }, fallback);
}

export async function clearOfflineData() {
  memoryKv.clear();
  memoryDrafts.clear();
  memoryActions.clear();
  const db = await openDb();
  if (!db) {
    notifyOfflineChange();
    return;
  }
  await new Promise<void>((resolve) => {
    const transaction = db.transaction([KV_STORE, ACTION_STORE], "readwrite");
    transaction.objectStore(KV_STORE).clear();
    transaction.objectStore(ACTION_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
  db.close();
  notifyOfflineChange();
}

export const offlineLimits = { feedItems: FEED_LIMIT, drafts: DRAFT_LIMIT, queuedActions: ACTION_LIMIT } as const;
