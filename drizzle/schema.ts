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
  bio: text("bio"),
  age: int("age"),
  location: varchar("location", { length: 120 }),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
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
