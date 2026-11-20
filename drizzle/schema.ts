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
  transparencyPoints: int("transparencyPoints").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const posts = mysqlTable("posts", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), body: text("body"), imageUrl: text("imageUrl"), imageMimeType: varchar("imageMimeType", { length: 40 }), mediaType: mysqlEnum("mediaType", ["image"]), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [index("posts_user_idx").on(table.userId), index("posts_created_idx").on(table.createdAt)]);
export const comments = mysqlTable("comments", { id: int("id").autoincrement().primaryKey(), postId: int("postId").notNull(), userId: int("userId").notNull(), body: text("body").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("comments_post_idx").on(table.postId), index("comments_user_idx").on(table.userId)]);
export const messages = mysqlTable("messages", { id: int("id").autoincrement().primaryKey(), senderId: int("senderId").notNull(), recipientId: int("recipientId").notNull(), body: text("body").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("messages_sender_idx").on(table.senderId), index("messages_recipient_idx").on(table.recipientId)]);
export const chatRooms = mysqlTable("chat_rooms", { id: int("id").autoincrement().primaryKey(), name: varchar("name", { length: 160 }).notNull(), description: text("description"), status: mysqlEnum("status", ["draft", "scheduled", "live", "closed", "archived"]).default("draft").notNull(), scheduledAt: timestamp("scheduledAt"), closedAt: timestamp("closedAt"), closedBy: int("closedBy"), createdBy: int("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [index("chat_rooms_status_idx").on(table.status), index("chat_rooms_created_idx").on(table.createdAt)]);
export const chatMembers = mysqlTable("chat_members", { id: int("id").autoincrement().primaryKey(), roomId: int("roomId").notNull(), userId: int("userId").notNull(), role: mysqlEnum("role", ["member", "moderator", "owner"]).default("member").notNull(), mutedUntil: timestamp("mutedUntil"), blockedAt: timestamp("blockedAt"), blockedBy: int("blockedBy"), joinedAt: timestamp("joinedAt").defaultNow().notNull() }, (table) => [uniqueIndex("chat_member_unique").on(table.roomId, table.userId), index("chat_members_room_idx").on(table.roomId)]);
export const chatMessages = mysqlTable("chat_messages", { id: int("id").autoincrement().primaryKey(), roomId: int("roomId").notNull(), userId: int("userId").notNull(), body: text("body").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("chat_messages_room_idx").on(table.roomId), index("chat_messages_created_idx").on(table.createdAt)]);
export const chatReports = mysqlTable("chat_reports", { id: int("id").autoincrement().primaryKey(), roomId: int("roomId").notNull(), messageId: int("messageId"), reporterId: int("reporterId").notNull(), reason: varchar("reason", { length: 500 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("chat_reports_room_idx").on(table.roomId), index("chat_reports_message_idx").on(table.messageId)]);
export const interactions = mysqlTable("interactions", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), type: mysqlEnum("type", ["like", "comment", "follow"]).notNull(), postId: int("postId"), targetUserId: int("targetUserId"), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [uniqueIndex("interaction_post_unique").on(table.userId, table.type, table.postId), uniqueIndex("interaction_user_unique").on(table.userId, table.type, table.targetUserId), index("interactions_post_idx").on(table.postId), index("interactions_target_user_idx").on(table.targetUserId)]);
export const wallets = mysqlTable("wallets", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), balanceEgp: decimal("balanceEgp", { precision: 12, scale: 2 }).default("0.00").notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [uniqueIndex("wallet_user_unique").on(table.userId)]);
export const gifts = mysqlTable("gifts", { id: int("id").autoincrement().primaryKey(), giftName: varchar("giftName", { length: 80 }).notNull(), iconUrl: text("iconUrl").notNull(), priceEgp: decimal("priceEgp", { precision: 12, scale: 2 }).notNull(), isActive: int("isActive").default(1).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const giftTransactions = mysqlTable("gift_transactions", { id: int("id").autoincrement().primaryKey(), senderId: int("senderId").notNull(), recipientId: int("recipientId").notNull(), giftId: int("giftId").notNull(), postId: int("postId"), commentId: int("commentId"), messageId: int("messageId"), chatRoomId: int("chatRoomId"), chatMessageId: int("chatMessageId"), amountEgp: decimal("amountEgp", { precision: 12, scale: 2 }).notNull(), status: mysqlEnum("status", ["completed", "reversed"]).default("completed").notNull(), idempotencyKey: varchar("idempotencyKey", { length: 80 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [uniqueIndex("gift_tx_idempotency_unique").on(table.senderId, table.idempotencyKey), index("gift_tx_sender_idx").on(table.senderId), index("gift_tx_recipient_idx").on(table.recipientId), index("gift_tx_comment_idx").on(table.commentId), index("gift_tx_message_idx").on(table.messageId), index("gift_tx_chat_room_idx").on(table.chatRoomId), index("gift_tx_chat_message_idx").on(table.chatMessageId)]);

export const marriageDeclarations = mysqlTable("marriage_declarations", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), version: int("version").notNull(), maritalStatusDetail: varchar("maritalStatusDetail", { length: 120 }).notNull(), hasChildren: int("hasChildren").notNull(), childrenCount: int("childrenCount").default(0).notNull(), essentialObligations: text("essentialObligations").notNull(), additionalNotes: text("additionalNotes"), status: mysqlEnum("status", ["confirmed", "superseded"]).default("confirmed").notNull(), dataHash: varchar("dataHash", { length: 128 }).notNull(), confirmedAt: timestamp("confirmedAt").defaultNow().notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("declarations_user_idx").on(table.userId), uniqueIndex("declarations_version_unique").on(table.userId, table.version)]);
export const declarationAcceptances = mysqlTable("declaration_acceptances", { id: int("id").autoincrement().primaryKey(), declarationId: int("declarationId").notNull(), userId: int("userId").notNull(), acceptanceText: text("acceptanceText").notNull(), dataHash: varchar("dataHash", { length: 128 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("acceptances_declaration_idx").on(table.declarationId)]);
export const transparencyEvents = mysqlTable("transparency_events", { id: int("id").autoincrement().primaryKey(), actorUserId: int("actorUserId").notNull(), eventType: varchar("eventType", { length: 80 }).notNull(), entityType: varchar("entityType", { length: 80 }).notNull(), entityId: int("entityId").notNull(), payloadHash: varchar("payloadHash", { length: 128 }).notNull(), previousEventHash: varchar("previousEventHash", { length: 128 }), eventHash: varchar("eventHash", { length: 128 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("transparency_events_entity_idx").on(table.entityType, table.entityId), index("transparency_events_created_idx").on(table.createdAt)]);
export const verifiedQuestions = mysqlTable("verified_questions", { id: int("id").autoincrement().primaryKey(), askerId: int("askerId").notNull(), respondentId: int("respondentId").notNull(), conversationKey: varchar("conversationKey", { length: 160 }).notNull(), category: varchar("category", { length: 80 }).notNull(), question: text("question").notNull(), questionHash: varchar("questionHash", { length: 128 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("verified_questions_conversation_idx").on(table.conversationKey)]);
export const verifiedAnswers = mysqlTable("verified_answers", { id: int("id").autoincrement().primaryKey(), questionId: int("questionId").notNull(), respondentId: int("respondentId").notNull(), answer: text("answer").notNull(), answerHash: varchar("answerHash", { length: 128 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [uniqueIndex("verified_answer_question_unique").on(table.questionId)]);

export const vaultDocuments = mysqlTable("vault_documents", { id: int("id").autoincrement().primaryKey(), ownerId: int("ownerId").notNull(), title: varchar("title", { length: 180 }).notNull(), mimeType: varchar("mimeType", { length: 120 }).notNull(), storageKey: text("storageKey").notNull(), sha256: varchar("sha256", { length: 128 }).notNull(), iv: varchar("iv", { length: 64 }).notNull(), authTag: varchar("authTag", { length: 64 }).notNull(), sizeBytes: int("sizeBytes").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("vault_documents_owner_idx").on(table.ownerId)]);
export const premaritalAgreements = mysqlTable("premarital_agreements", { id: int("id").autoincrement().primaryKey(), initiatorId: int("initiatorId").notNull(), counterpartyId: int("counterpartyId").notNull(), status: mysqlEnum("status", ["draft", "shared", "accepted_by_one", "accepted_by_both", "locked", "archived"]).default("draft").notNull(), version: int("version").default(1).notNull(), contentHash: varchar("contentHash", { length: 128 }).notNull(), legalDisclaimer: text("legalDisclaimer").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => [index("agreements_initiator_idx").on(table.initiatorId), index("agreements_counterparty_idx").on(table.counterpartyId)]);
export const agreementTerms = mysqlTable("agreement_terms", { id: int("id").autoincrement().primaryKey(), agreementId: int("agreementId").notNull(), version: int("version").notNull(), termType: varchar("termType", { length: 80 }).notNull(), label: varchar("label", { length: 180 }).notNull(), value: text("value").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("agreement_terms_agreement_idx").on(table.agreementId)]);
export const agreementSignatures = mysqlTable("agreement_signatures", { id: int("id").autoincrement().primaryKey(), agreementId: int("agreementId").notNull(), signerId: int("signerId").notNull(), version: int("version").notNull(), contentHash: varchar("contentHash", { length: 128 }).notNull(), consentText: text("consentText").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [uniqueIndex("agreement_signature_unique").on(table.agreementId, table.signerId, table.version)]);
export const subscriptionProducts = mysqlTable("subscription_products", { id: int("id").autoincrement().primaryKey(), code: varchar("code", { length: 80 }).notNull().unique(), name: varchar("name", { length: 120 }).notNull(), priceEgp: decimal("priceEgp", { precision: 12, scale: 2 }).notNull(), durationDays: int("durationDays").notNull(), isActive: int("isActive").default(1).notNull() });
export const subscriptions = mysqlTable("subscriptions", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), productId: int("productId").notNull(), provider: varchar("provider", { length: 80 }).notNull(), externalReference: varchar("externalReference", { length: 180 }).notNull(), status: mysqlEnum("status", ["pending", "active", "expired", "cancelled", "reversed"]).default("pending").notNull(), startsAt: timestamp("startsAt"), endsAt: timestamp("endsAt"), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [uniqueIndex("subscription_external_unique").on(table.provider, table.externalReference), index("subscriptions_user_idx").on(table.userId)]);
export const questionProposals = mysqlTable("question_proposals", { id: int("id").autoincrement().primaryKey(), proposerId: int("proposerId").notNull(), category: mysqlEnum("category", ["financial", "social", "family", "special_conditions"]).notNull(), question: text("question").notNull(), normalizedHash: varchar("normalizedHash", { length: 128 }).notNull().unique(), status: mysqlEnum("status", ["pending", "approved_library", "approved_popular", "rejected"]).default("pending").notNull(), rejectionReason: varchar("rejectionReason", { length: 180 }), reviewedBy: int("reviewedBy"), reviewedAt: timestamp("reviewedAt"), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("question_proposals_status_idx").on(table.status), index("question_proposals_proposer_idx").on(table.proposerId)]);
export const questionProposalVotes = mysqlTable("question_proposal_votes", { id: int("id").autoincrement().primaryKey(), proposalId: int("proposalId").notNull(), userId: int("userId").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [uniqueIndex("question_proposal_vote_unique").on(table.proposalId, table.userId), index("question_proposal_votes_proposal_idx").on(table.proposalId)]);
export const notifications = mysqlTable("notifications", { id: int("id").autoincrement().primaryKey(), recipientId: int("recipientId").notNull(), actorId: int("actorId").notNull(), type: mysqlEnum("type", ["like", "comment", "follow", "gift", "moderation"]).notNull(), entityId: int("entityId"), message: varchar("message", { length: 240 }).notNull(), readAt: timestamp("readAt"), createdAt: timestamp("createdAt").defaultNow().notNull() }, (table) => [index("notifications_recipient_idx").on(table.recipientId), index("notifications_created_idx").on(table.createdAt)]);

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
export type MarriageDeclaration = typeof marriageDeclarations.$inferSelect;
export type VerifiedQuestion = typeof verifiedQuestions.$inferSelect;
export type VerifiedAnswer = typeof verifiedAnswers.$inferSelect;
export type VaultDocument = typeof vaultDocuments.$inferSelect;
export type PremaritalAgreement = typeof premaritalAgreements.$inferSelect;
export type QuestionProposal = typeof questionProposals.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
