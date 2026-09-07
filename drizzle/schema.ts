import {
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  accountType: mysqlEnum("accountType", ["member", "official", "demo"]).default("member").notNull(),
  bio: text("bio"),
  age: int("age"),
  location: varchar("location", { length: 120 }),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  curriculumVitae: text("curriculumVitae"),
  specifications: text("specifications"),
  skills: text("skills"),
  occupation: varchar("occupation", { length: 160 }),
  education: varchar("education", { length: 160 }),
  maritalStatus: mysqlEnum("maritalStatus", ["single", "divorced", "widowed"]).default("single"),
  preferredAgeMin: int("preferredAgeMin"),
  preferredAgeMax: int("preferredAgeMax"),
  preferredLocations: text("preferredLocations"),
  interests: text("interests"),
  showCompatibility: int("showCompatibility").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    body: text("body"),
    imageUrl: text("imageUrl"),
    imageMimeType: varchar("imageMimeType", { length: 40 }),
    // Deliberately limited to image: the schema cannot represent a video post.
    mediaType: mysqlEnum("mediaType", ["image"]),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("posts_user_idx").on(table.userId), index("posts_created_idx").on(table.createdAt)],
);

export const comments = mysqlTable(
  "comments",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId").notNull(),
    userId: int("userId").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("comments_post_idx").on(table.postId), index("comments_user_idx").on(table.userId)],
);

export const messages = mysqlTable(
  "messages",
  {
    id: int("id").autoincrement().primaryKey(),
    senderId: int("senderId").notNull(),
    recipientId: int("recipientId").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("messages_sender_idx").on(table.senderId),
    index("messages_recipient_idx").on(table.recipientId),
  ],
);

export const chatRooms = mysqlTable(
  "chat_rooms",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["draft", "scheduled", "live", "closed", "archived"]).default("draft").notNull(),
    scheduledAt: timestamp("scheduledAt"),
    closedAt: timestamp("closedAt"),
    closedBy: int("closedBy"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("chat_rooms_status_idx").on(table.status), index("chat_rooms_created_idx").on(table.createdAt)],
);

export const chatMembers = mysqlTable(
  "chat_members",
  {
    id: int("id").autoincrement().primaryKey(),
    roomId: int("roomId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["member", "moderator", "owner"]).default("member").notNull(),
    mutedUntil: timestamp("mutedUntil"),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("chat_member_unique").on(table.roomId, table.userId), index("chat_members_room_idx").on(table.roomId)],
);

export const chatMessages = mysqlTable(
  "chat_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    roomId: int("roomId").notNull(),
    userId: int("userId").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("chat_messages_room_idx").on(table.roomId), index("chat_messages_created_idx").on(table.createdAt)],
);

export const chatReports = mysqlTable(
  "chat_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    roomId: int("roomId").notNull(),
    messageId: int("messageId"),
    reporterId: int("reporterId").notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("chat_reports_room_idx").on(table.roomId), index("chat_reports_message_idx").on(table.messageId)],
);

export const interactions = mysqlTable(
  "interactions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    type: mysqlEnum("type", ["like", "comment", "follow"]).notNull(),
    postId: int("postId"),
    targetUserId: int("targetUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("interaction_post_unique").on(table.userId, table.type, table.postId),
    uniqueIndex("interaction_user_unique").on(table.userId, table.type, table.targetUserId),
    index("interactions_post_idx").on(table.postId),
    index("interactions_target_user_idx").on(table.targetUserId),
  ],
);

export const wallets = mysqlTable(
  "wallets",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    // Decimal(12,2) is intentional: never represent EGP money with JS floating point.
    balanceEgp: decimal("balanceEgp", { precision: 12, scale: 2 }).default("0.00").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("wallet_user_unique").on(table.userId)],
);

export const gifts = mysqlTable("gifts", {
  id: int("id").autoincrement().primaryKey(),
  giftName: varchar("giftName", { length: 80 }).notNull(),
  iconUrl: text("iconUrl").notNull(),
  priceEgp: decimal("priceEgp", { precision: 12, scale: 2 }).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const giftTransactions = mysqlTable(
  "gift_transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    senderId: int("senderId").notNull(),
    recipientId: int("recipientId").notNull(),
    giftId: int("giftId").notNull(),
    postId: int("postId"),
    commentId: int("commentId"),
    messageId: int("messageId"),
    chatRoomId: int("chatRoomId"),
    chatMessageId: int("chatMessageId"),
    amountEgp: decimal("amountEgp", { precision: 12, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["completed", "reversed"]).default("completed").notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 80 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("gift_tx_idempotency_unique").on(table.senderId, table.idempotencyKey),
    index("gift_tx_sender_idx").on(table.senderId),
    index("gift_tx_recipient_idx").on(table.recipientId),
    index("gift_tx_comment_idx").on(table.commentId),
    index("gift_tx_message_idx").on(table.messageId),
    index("gift_tx_chat_room_idx").on(table.chatRoomId),
    index("gift_tx_chat_message_idx").on(table.chatMessageId),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type GiftTransaction = typeof giftTransactions.$inferSelect;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatMember = typeof chatMembers.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
