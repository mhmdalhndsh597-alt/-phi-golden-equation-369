import { and, desc, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  chatMembers,
  chatMessages,
  chatReports,
  chatRooms,
  comments,
  giftTransactions,
  gifts,
  interactions,
  messages,
  posts,
  users,
  wallets,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { moderateText } from "./moderation";
import { calculateCompatibility } from "./compatibility";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  const savedUser = await getUserByOpenId(user.openId);
  if (savedUser) {
    await db.insert(wallets).values({ userId: savedUser.id, balanceEgp: "0.00" }).onDuplicateKeyUpdate({ set: { userId: savedUser.id } });
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ id: users.id, name: users.name, email: users.email, bio: users.bio, age: users.age, location: users.location, gender: users.gender, verificationStatus: users.verificationStatus, curriculumVitae: users.curriculumVitae, specifications: users.specifications, skills: users.skills, occupation: users.occupation, education: users.education, maritalStatus: users.maritalStatus, preferredAgeMin: users.preferredAgeMin, preferredAgeMax: users.preferredAgeMax, preferredLocations: users.preferredLocations, interests: users.interests, showCompatibility: users.showCompatibility, createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function listCompatibilitySuggestions(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const current = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!current) return [];
  const candidates = await db.select().from(users).where(and(sql`${users.id} <> ${userId}`, eq(users.showCompatibility, 1))).orderBy(desc(users.updatedAt)).limit(Math.min(Math.max(Math.trunc(limit), 1), 50));
  return candidates.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    location: candidate.location,
    bio: candidate.bio,
    verificationStatus: candidate.verificationStatus,
    accountType: candidate.accountType,
    compatibility: calculateCompatibility(current, candidate),
  })).sort((a, b) => b.compatibility.percentage - a.compatibility.percentage);
}

export function normalizeFeedLimit(limit = 30) {
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export function validateProfilePatch(input: { age?: number; preferredAgeMin?: number; preferredAgeMax?: number }) {
  if (input.age !== undefined && (input.age < 18 || input.age > 90)) throw new Error("Age must be between 18 and 90");
  if (input.preferredAgeMin !== undefined && (input.preferredAgeMin < 18 || input.preferredAgeMin > 90)) throw new Error("Minimum preferred age must be between 18 and 90");
  if (input.preferredAgeMax !== undefined && (input.preferredAgeMax < 18 || input.preferredAgeMax > 90)) throw new Error("Maximum preferred age must be between 18 and 90");
  if (input.preferredAgeMin !== undefined && input.preferredAgeMax !== undefined && input.preferredAgeMin > input.preferredAgeMax) throw new Error("Minimum preferred age cannot exceed maximum");
  return true;
}

export async function updateProfile(userId: number, input: { name?: string; bio?: string; age?: number; location?: string; gender?: "male" | "female" | "other"; curriculumVitae?: string; specifications?: string; skills?: string; occupation?: string; education?: string; maritalStatus?: "single" | "divorced" | "widowed"; preferredAgeMin?: number; preferredAgeMax?: number; preferredLocations?: string; interests?: string; showCompatibility?: number }) {
  validateProfilePatch(input);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = {
    ...(input.name === undefined ? {} : { name: input.name.trim().slice(0, 160) || null }),
    ...(input.bio === undefined ? {} : { bio: input.bio.trim().slice(0, 2_000) || null }),
    ...(input.age === undefined ? {} : { age: input.age }),
    ...(input.location === undefined ? {} : { location: input.location.trim().slice(0, 120) || null }),
    ...(input.gender === undefined ? {} : { gender: input.gender }),
    ...(input.curriculumVitae === undefined ? {} : { curriculumVitae: input.curriculumVitae.trim().slice(0, 4_000) || null }),
    ...(input.specifications === undefined ? {} : { specifications: input.specifications.trim().slice(0, 2_000) || null }),
    ...(input.skills === undefined ? {} : { skills: input.skills.trim().slice(0, 1_000) || null }),
    ...(input.occupation === undefined ? {} : { occupation: input.occupation.trim().slice(0, 160) || null }),
    ...(input.education === undefined ? {} : { education: input.education.trim().slice(0, 160) || null }),
    ...(input.maritalStatus === undefined ? {} : { maritalStatus: input.maritalStatus }),
    ...(input.preferredAgeMin === undefined ? {} : { preferredAgeMin: input.preferredAgeMin }),
    ...(input.preferredAgeMax === undefined ? {} : { preferredAgeMax: input.preferredAgeMax }),
    ...(input.preferredLocations === undefined ? {} : { preferredLocations: input.preferredLocations.trim().slice(0, 500) || null }),
    ...(input.interests === undefined ? {} : { interests: input.interests.trim().slice(0, 1_000) || null }),
    ...(input.showCompatibility === undefined ? {} : { showCompatibility: input.showCompatibility ? 1 : 0 }),
  };
  if (input.age !== undefined && (input.age < 18 || input.age > 90)) throw new Error("Age must be between 18 and 90");
  if (Object.keys(values).length === 0) throw new Error("No profile fields provided");
  await db.update(users).set(values).where(eq(users.id, userId));
  return getProfile(userId);
}

export async function listAdminUsers(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, age: users.age, location: users.location, verificationStatus: users.verificationStatus, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.createdAt)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function listAdminGifts(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gifts).orderBy(gifts.priceEgp).limit(Math.min(Math.max(limit, 1), 100));
}

export async function listAdminPosts(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ post: posts, author: users }).from(posts).leftJoin(users, eq(posts.userId, users.id)).orderBy(desc(posts.createdAt)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function listFeed(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ post: posts, author: users })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(normalizeFeedLimit(limit));

  return Promise.all(rows.map(async ({ post, author }) => {
    const postComments = await db
      .select({ comment: comments, author: users, giftTransaction: giftTransactions, gift: gifts })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .leftJoin(giftTransactions, eq(giftTransactions.commentId, comments.id))
      .leftJoin(gifts, eq(gifts.id, giftTransactions.giftId))
      .where(eq(comments.postId, post.id))
      .orderBy(desc(comments.createdAt));
    return { ...post, author, comments: postComments };
  }));
}

export function canJoinChatRoom(status: "draft" | "scheduled" | "live" | "closed" | "archived") {
  return status === "scheduled" || status === "live";
}

export function canWriteToChatRoom(status: "draft" | "scheduled" | "live" | "closed" | "archived") {
  return status === "live";
}

export async function listChatRooms() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatRooms).where(or(eq(chatRooms.status, "scheduled"), eq(chatRooms.status, "live"), eq(chatRooms.status, "closed"))).orderBy(desc(chatRooms.createdAt));
}

export async function createChatRoom(input: { userId: number; name: string; description?: string; scheduledAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(chatRooms).values({ createdBy: input.userId, name: input.name.trim().slice(0, 160), description: input.description?.trim().slice(0, 2_000) || null, scheduledAt: input.scheduledAt ?? null, status: input.scheduledAt ? "scheduled" : "live" });
  const roomId = Number(result[0].insertId);
  await db.insert(chatMembers).values({ roomId, userId: input.userId, role: "owner" });
  return getChatRoom(roomId);
}

export async function getChatRoom(roomId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId)).limit(1);
  return rows[0];
}

async function requireRoomMember(userId: number, roomId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const membership = await db.select().from(chatMembers).where(and(eq(chatMembers.roomId, roomId), eq(chatMembers.userId, userId))).limit(1);
  if (!membership[0]) throw new Error("You must join this room first");
  return { db, member: membership[0] };
}

export async function joinChatRoom(userId: number, roomId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const room = await getChatRoom(roomId);
  if (!room) throw new Error("Room not found");
  if (!canJoinChatRoom(room.status)) throw new Error("This room is not open");
  await db.insert(chatMembers).values({ roomId, userId, role: "member" }).onDuplicateKeyUpdate({ set: { roomId } });
  return room;
}

export async function listChatMessages(userId: number, roomId: number, limit = 50) {
  const { db } = await requireRoomMember(userId, roomId);
  return db.select({ message: chatMessages, author: users, giftTransaction: giftTransactions, gift: gifts }).from(chatMessages).leftJoin(users, eq(chatMessages.userId, users.id)).leftJoin(giftTransactions, eq(giftTransactions.chatMessageId, chatMessages.id)).leftJoin(gifts, eq(gifts.id, giftTransactions.giftId)).where(eq(chatMessages.roomId, roomId)).orderBy(desc(chatMessages.createdAt)).limit(Math.min(Math.max(Math.trunc(limit), 1), 100));
}

export async function sendChatMessage(userId: number, roomId: number, body: string) {
  const { db, member } = await requireRoomMember(userId, roomId);
  const room = await getChatRoom(roomId);
  if (!room || !canWriteToChatRoom(room.status)) throw new Error("This room is not accepting messages");
  if (member.mutedUntil && member.mutedUntil.getTime() > Date.now()) throw new Error("You are muted in this room");
  const cleanBody = moderateText(body, 2_000, "Chat message");
  const result = await db.insert(chatMessages).values({ roomId, userId, body: cleanBody });
  return { id: Number(result[0].insertId), roomId, userId, body: cleanBody };
}

export async function setChatRoomStatus(userId: number, roomId: number, status: "scheduled" | "live" | "closed" | "archived") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId)).limit(1);
  if (!room) throw new Error("Room not found");
  const [actor] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const [membership] = await db.select({ role: chatMembers.role }).from(chatMembers).where(and(eq(chatMembers.roomId, roomId), eq(chatMembers.userId, userId))).limit(1);
  if (actor?.role !== "admin" && membership?.role !== "owner") throw new Error("Only the room owner or admin can change room status");
  await db.update(chatRooms).set({ status, closedAt: status === "closed" || status === "archived" ? new Date() : null, closedBy: status === "closed" || status === "archived" ? userId : null }).where(eq(chatRooms.id, roomId));
  return getChatRoom(roomId);
}

export async function reportChatMessage(userId: number, roomId: number, messageId: number | undefined, reason: string) {
  const { db } = await requireRoomMember(userId, roomId);
  const cleanReason = moderateText(reason, 500, "Report reason");
  await db.insert(chatReports).values({ roomId, messageId: messageId ?? null, reporterId: userId, reason: cleanReason });
  return { success: true } as const;
}

export async function getWalletBalance(userId: number) {
  const db = await getDb();
  if (!db) return { balanceEgp: "0.00" };
  const wallet = await db.select({ balanceEgp: wallets.balanceEgp }).from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return { balanceEgp: wallet[0]?.balanceEgp ?? "0.00" };
}

export async function listActiveGifts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gifts).where(eq(gifts.isActive, 1)).orderBy(gifts.priceEgp);
}

export async function createPost(input: { userId: number; body?: string; imageUrl?: string; imageMimeType?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const body = input.body ? moderateText(input.body, 10_000, "Post") : null;
  const imageUrl = input.imageUrl?.trim() || null;
  if (!body && !imageUrl) throw new Error("A post must contain text or an image");
  if (imageUrl) {
    if (!/^https:\/\//i.test(imageUrl)) throw new Error("Images must use HTTPS URLs");
    if (/\.(mp4|mov|webm|avi|mkv)(?:$|[?#])/i.test(imageUrl)) throw new Error("Video posts are not allowed");
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(input.imageMimeType ?? "")) throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed");
  }
  const result = await db.insert(posts).values({ userId: input.userId, body, imageUrl, imageMimeType: imageUrl ? input.imageMimeType!.toLowerCase() : null, mediaType: imageUrl ? "image" : null });
  return { id: result[0].insertId };
}

export async function addComment(input: { postId: number; userId: number; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const body = moderateText(input.body, 2_000, "Comment");
  const post = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, input.postId)).limit(1);
  if (!post[0]) throw new Error("Post not found");
  const result = await db.insert(comments).values({ postId: input.postId, userId: input.userId, body });
  return { id: result[0].insertId };
}

export async function toggleInteraction(input: { userId: number; type: "like" | "follow"; postId?: number; targetUserId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.type === "like" && !input.postId) throw new Error("A like requires a post");
  if (input.type === "follow" && !input.targetUserId) throw new Error("A follow requires a user");
  if (input.type === "follow" && input.targetUserId === input.userId) throw new Error("You cannot follow yourself");
  const conditions = [eq(interactions.userId, input.userId), eq(interactions.type, input.type)];
  if (input.postId) conditions.push(eq(interactions.postId, input.postId));
  if (input.targetUserId) conditions.push(eq(interactions.targetUserId, input.targetUserId));
  const existing = await db.select({ id: interactions.id }).from(interactions).where(and(...conditions)).limit(1);
  if (existing[0]) {
    await db.delete(interactions).where(eq(interactions.id, existing[0].id));
    return { active: false };
  }
  await db.insert(interactions).values({ userId: input.userId, type: input.type, postId: input.postId, targetUserId: input.targetUserId });
  return { active: true };
}

export async function listMessages(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ message: messages, giftTransaction: giftTransactions, gift: gifts })
    .from(messages)
    .leftJoin(giftTransactions, eq(giftTransactions.messageId, messages.id))
    .leftJoin(gifts, eq(gifts.id, giftTransactions.giftId))
    .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
    .orderBy(desc(messages.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function sendMessage(input: { senderId: number; recipientId: number; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.senderId === input.recipientId) throw new Error("You cannot message yourself");
  const body = moderateText(input.body, 4_000, "Message");
  const recipient = await db.select({ id: users.id }).from(users).where(eq(users.id, input.recipientId)).limit(1);
  if (!recipient[0]) throw new Error("Recipient not found");
  const result = await db.insert(messages).values({ senderId: input.senderId, recipientId: input.recipientId, body });
  return { id: result[0].insertId };
}

function decimalToCents(value: string | number) {
  const normalized = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Invalid monetary amount");
  const [whole, fraction = ""] = normalized.split(".");
  // DECIMAL(12,2) has at most 10 whole digits, so integer cents remain exact and safe.
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

export function validateChatGiftRoomState(status: string | undefined, hasMessageOwnerMatch: boolean, hasSenderMembership: boolean) {
  if (status !== "live" || !hasMessageOwnerMatch) throw new Error("Room gifts are available only for messages in a live room");
  if (!hasSenderMembership) throw new Error("You must be a room member to send a room gift");
  return true;
}

export function validateGiftContext(input: { commentId?: number; messageId?: number; chatRoomId?: number; chatMessageId?: number }) {
  if ((input.commentId ? 1 : 0) + (input.messageId ? 1 : 0) + (input.chatMessageId ? 1 : 0) !== 1) throw new Error("A gift must be attached to exactly one context");
  if (input.chatMessageId && !input.chatRoomId) throw new Error("A room message gift requires a room");
  return true;
}

export type SendGiftInput = {
  senderId: number;
  recipientId: number;
  giftId: number;
  commentId?: number;
  messageId?: number;
  chatRoomId?: number;
  chatMessageId?: number;
  idempotencyKey: string;
};

/**
 * Critical-money path. The wallet row is locked with SELECT ... FOR UPDATE
 * inside the same transaction as the balance check, deduction, and audit log.
 */
export async function sendGiftAtomic(input: SendGiftInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.senderId === input.recipientId) throw new Error("You cannot send a gift to yourself");
  if (!/^[A-Za-z0-9:_-]{16,80}$/.test(input.idempotencyKey)) throw new Error("Invalid idempotency key");
  validateGiftContext(input);

  return db.transaction(async (tx) => {
    const previous = await tx.select().from(giftTransactions).where(and(eq(giftTransactions.senderId, input.senderId), eq(giftTransactions.idempotencyKey, input.idempotencyKey))).limit(1);
    if (previous[0]) return { transactionId: previous[0].id, amountEgp: previous[0].amountEgp, balanceEgp: null, idempotent: true };

    const gift = (await tx.select().from(gifts).where(and(eq(gifts.id, input.giftId), eq(gifts.isActive, 1))).limit(1))[0];
    if (!gift) throw new Error("Gift is unavailable");

    const recipient = (await tx.select({ id: users.id }).from(users).where(eq(users.id, input.recipientId)).limit(1))[0];
    if (!recipient) throw new Error("Recipient not found");

    if (input.commentId) {
      const comment = (await tx.select({ userId: comments.userId }).from(comments).where(eq(comments.id, input.commentId)).limit(1))[0];
      if (!comment || comment.userId !== input.recipientId) throw new Error("Gift recipient does not match the comment owner");
    }
    if (input.messageId) {
      const message = (await tx.select().from(messages).where(eq(messages.id, input.messageId)).limit(1))[0];
      if (!message || message.recipientId !== input.recipientId || message.senderId !== input.senderId) throw new Error("Gift recipient does not match the message");
    }
    if (input.chatMessageId) {
      const room = (await tx.select().from(chatRooms).where(eq(chatRooms.id, input.chatRoomId!)).limit(1))[0];
      const chatMessage = (await tx.select().from(chatMessages).where(and(eq(chatMessages.id, input.chatMessageId), eq(chatMessages.roomId, input.chatRoomId!))).limit(1))[0];
      const senderMembership = (await tx.select().from(chatMembers).where(and(eq(chatMembers.roomId, input.chatRoomId!), eq(chatMembers.userId, input.senderId))).limit(1))[0];
      validateChatGiftRoomState(room?.status, Boolean(chatMessage && chatMessage.userId === input.recipientId), Boolean(senderMembership));
    }

    // Ensure a zero-balance wallet exists, then lock the exact row.
    await tx.insert(wallets).values({ userId: input.senderId, balanceEgp: "0.00" }).onDuplicateKeyUpdate({ set: { userId: input.senderId } });
    const wallet = (await tx.select().from(wallets).where(eq(wallets.userId, input.senderId)).limit(1).for("update"))[0];
    if (!wallet) throw new Error("Sender wallet not found");

    const priceCents = decimalToCents(gift.priceEgp);
    const balanceCents = decimalToCents(wallet.balanceEgp);
    if (balanceCents < priceCents) throw new Error("Insufficient wallet balance");

    await tx.update(wallets).set({ balanceEgp: sql`${wallets.balanceEgp} - ${gift.priceEgp}` }).where(eq(wallets.id, wallet.id));
    const inserted = await tx.insert(giftTransactions).values({
      senderId: input.senderId,
      recipientId: input.recipientId,
      giftId: input.giftId,
      postId: null,
      commentId: input.commentId,
      messageId: input.messageId,
      chatRoomId: input.chatRoomId,
      chatMessageId: input.chatMessageId,
      amountEgp: gift.priceEgp,
      idempotencyKey: input.idempotencyKey,
      status: "completed",
    });
    const newBalanceCents = balanceCents - priceCents;
    const balanceEgp = `${Math.floor(newBalanceCents / 100)}.${String(newBalanceCents % 100).padStart(2, "0")}`;
    return { transactionId: inserted[0].insertId, amountEgp: gift.priceEgp, balanceEgp, idempotent: false };
  });
}
