import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { uploadVerifiedImage } from "./media";
import {
  addComment,
  createPost,
  listActiveGifts,
  listFeed,
  listMessages,
  listUserNotifications,
  getProfile,
  listAdminPosts,
  listAdminUsers,
  listAdminGifts,
  getWalletBalance,
  updateProfile,
  sendGiftAtomic,
  sendMessage,
  toggleInteraction,
  listCompatibilitySuggestions,
  listChatRooms,
  createChatRoom,
  joinChatRoom,
  listChatMessages,
  sendChatMessage,
  setChatRoomStatus,
  reportChatMessage,
  listChatMembers,
  moderateChatMember,
  markNotificationsRead,
} from "./db";
import {
  addAgreementTerm,
  answerVerifiedQuestion,
  createAgreement,
  createDeclaration,
  createVerifiedQuestion,
  downloadVaultDocument,
  generateAgreementPdf,
  listMyDeclarations,
  listMySubscriptions,
  listVerifiedConversation,
  listVaultDocuments,
  signAgreement,
  uploadVaultDocument,
} from "./transparency";
import { listAdminQuestionProposals, listPopularQuestions, listPublicQuestionLibrary, proposeQuestion, reviewQuestionProposal, toggleQuestionVote } from "./questionGovernance";

const idempotencyKey = z.string().regex(/^[A-Za-z0-9:_-]{16,80}$/, "Invalid idempotency key");

function featureError(error: unknown): never {
  throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Request could not be completed" });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  wallet: router({
    me: protectedProcedure.query(({ ctx }) => getWalletBalance(ctx.user.id)),
  }),

  notifications: router({
    mine: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional()).query(({ ctx, input }) => listUserNotifications(ctx.user.id, input?.limit ?? 50)),
    markRead: protectedProcedure.mutation(({ ctx }) => markNotificationsRead(ctx.user.id)),
  }),

  admin: router({
    users: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).optional()).query(({ input }) => listAdminUsers(input?.limit ?? 100)),
    posts: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).optional()).query(({ input }) => listAdminPosts(input?.limit ?? 100)),
    gifts: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).optional()).query(({ input }) => listAdminGifts(input?.limit ?? 100)),
    questionProposals: adminProcedure.query(() => listAdminQuestionProposals()),
    reviewQuestion: adminProcedure.input(z.object({ proposalId: z.number().int().positive(), status: z.enum(["approved_library", "approved_popular", "rejected"]), rejectionReason: z.string().max(180).optional(), editedQuestion: z.string().min(12).max(500).optional() })).mutation(async ({ ctx, input }) => {
      try { return await reviewQuestionProposal({ adminId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
  }),

  profile: router({
    me: protectedProcedure.query(({ ctx }) => getProfile(ctx.user.id)),
    update: protectedProcedure
      .input(z.object({ name: z.string().max(160).optional(), bio: z.string().max(2_000).optional(), age: z.number().int().optional(), location: z.string().max(120).optional(), gender: z.enum(["male", "female", "other"]).optional(), curriculumVitae: z.string().max(4_000).optional(), specifications: z.string().max(2_000).optional(), skills: z.string().max(1_000).optional(), occupation: z.string().max(160).optional(), education: z.string().max(160).optional(), maritalStatus: z.enum(["single", "divorced", "widowed"]).optional(), preferredAgeMin: z.number().int().optional(), preferredAgeMax: z.number().int().optional(), preferredLocations: z.string().max(500).optional(), interests: z.string().max(1_000).optional(), showCompatibility: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateProfile(ctx.user.id, { ...input, showCompatibility: input.showCompatibility === undefined ? undefined : input.showCompatibility ? 1 : 0 });
        } catch (error) {
          return featureError(error);
        }
      }),
    suggestions: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional()).query(({ ctx, input }) => listCompatibilitySuggestions(ctx.user.id, input?.limit ?? 20)),
  }),

  feed: router({
    uploadImage: protectedProcedure
      .input(z.object({ base64Data: z.string().min(16).max(7_500_000) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await uploadVerifiedImage(ctx.user.id, input.base64Data);
        } catch (error) {
          return featureError(error);
        }
      }),
    list: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional()).query(({ input }) => listFeed(input?.limit ?? 30)),
    createPost: protectedProcedure
      .input(z.object({ body: z.string().max(10_000).optional(), imageUrl: z.string().url().max(2_000).optional(), imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(), mediaType: z.literal("image").optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await createPost({ userId: ctx.user.id, body: input.body, imageUrl: input.imageUrl, imageMimeType: input.imageMimeType });
        } catch (error) {
          return featureError(error);
        }
      }),
    comment: protectedProcedure
      .input(z.object({ postId: z.number().int().positive(), body: z.string().min(1).max(2_000) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await addComment({ postId: input.postId, userId: ctx.user.id, body: input.body });
        } catch (error) {
          return featureError(error);
        }
      }),
    like: protectedProcedure
      .input(z.object({ postId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await toggleInteraction({ userId: ctx.user.id, type: "like", postId: input.postId });
        } catch (error) {
          return featureError(error);
        }
      }),
    follow: protectedProcedure
      .input(z.object({ targetUserId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await toggleInteraction({ userId: ctx.user.id, type: "follow", targetUserId: input.targetUserId });
        } catch (error) {
          return featureError(error);
        }
      }),
    messages: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
      .query(({ ctx, input }) => listMessages(ctx.user.id, input?.limit ?? 30)),
    message: protectedProcedure
      .input(z.object({ recipientId: z.number().int().positive(), body: z.string().min(1).max(4_000) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await sendMessage({ senderId: ctx.user.id, recipientId: input.recipientId, body: input.body });
        } catch (error) {
          return featureError(error);
        }
      }),
  }),

  chat: router({
    rooms: protectedProcedure.query(() => listChatRooms()),
    create: protectedProcedure.input(z.object({ name: z.string().min(2).max(160), description: z.string().max(2_000).optional(), scheduledAt: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
      try { return await createChatRoom({ userId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
    join: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try { return await joinChatRoom(ctx.user.id, input.roomId); } catch (error) { return featureError(error); }
    }),
    messages: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(50) })).query(async ({ ctx, input }) => {
      try { return await listChatMessages(ctx.user.id, input.roomId, input.limit); } catch (error) { return featureError(error); }
    }),
    members: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      try { return await listChatMembers(ctx.user.id, input.roomId); } catch (error) { return featureError(error); }
    }),
    send: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), body: z.string().min(1).max(2_000) })).mutation(async ({ ctx, input }) => {
      try { return await sendChatMessage(ctx.user.id, input.roomId, input.body); } catch (error) { return featureError(error); }
    }),
    status: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), status: z.enum(["scheduled", "live", "closed", "archived"]) })).mutation(async ({ ctx, input }) => {
      try { return await setChatRoomStatus(ctx.user.id, input.roomId, input.status); } catch (error) { return featureError(error); }
    }),
    report: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), messageId: z.number().int().positive().optional(), reason: z.string().min(3).max(500) })).mutation(async ({ ctx, input }) => {
      try { return await reportChatMessage(ctx.user.id, input.roomId, input.messageId, input.reason); } catch (error) { return featureError(error); }
    }),
    moderate: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), targetUserId: z.number().int().positive(), action: z.enum(["mute", "unmute", "block", "unblock"]), durationMinutes: z.number().int().min(1).max(10_080).optional() })).mutation(async ({ ctx, input }) => {
      try { return await moderateChatMember({ actorUserId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
  }),

  gifts: router({
    catalog: publicProcedure.query(() => listActiveGifts()),
    send: protectedProcedure
      .input(z.object({
        recipientId: z.number().int().positive(),
        giftId: z.number().int().positive(),
        commentId: z.number().int().positive().optional(),
        messageId: z.number().int().positive().optional(),
        chatRoomId: z.number().int().positive().optional(),
        chatMessageId: z.number().int().positive().optional(),
        idempotencyKey,
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await sendGiftAtomic({ senderId: ctx.user.id, ...input });
        } catch (error) {
          return featureError(error);
        }
      }),
  }),

  transparency: router({
    declarations: protectedProcedure.query(({ ctx }) => listMyDeclarations(ctx.user.id)),
    confirmDeclaration: protectedProcedure.input(z.object({ maritalStatusDetail: z.string().min(2).max(120), hasChildren: z.boolean(), childrenCount: z.number().int().min(0).max(30), essentialObligations: z.string().min(2).max(4_000), additionalNotes: z.string().max(4_000).optional() })).mutation(async ({ ctx, input }) => {
      try { return await createDeclaration({ userId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
    askVerified: protectedProcedure.input(z.object({ respondentId: z.number().int().positive(), conversationKey: z.string().min(2).max(160), category: z.string().min(2).max(80), question: z.string().min(2).max(2_000) })).mutation(async ({ ctx, input }) => {
      try { return await createVerifiedQuestion({ askerId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
    answerVerified: protectedProcedure.input(z.object({ questionId: z.number().int().positive(), answer: z.string().min(1).max(4_000) })).mutation(async ({ ctx, input }) => {
      try { return await answerVerifiedQuestion({ respondentId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
    verifiedConversation: protectedProcedure.input(z.object({ conversationKey: z.string().min(2).max(160) })).query(({ ctx, input }) => listVerifiedConversation(ctx.user.id, input.conversationKey)),
    questionLibrary: publicProcedure.query(() => listPublicQuestionLibrary()),
    popularQuestions: publicProcedure.query(() => listPopularQuestions()),
    proposeQuestion: protectedProcedure.input(z.object({ category: z.enum(["financial", "social", "family", "special_conditions"]), question: z.string().min(12).max(500) })).mutation(async ({ ctx, input }) => {
      try { return await proposeQuestion({ proposerId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
    voteQuestion: protectedProcedure.input(z.object({ proposalId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try { return await toggleQuestionVote({ userId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
  }),

  vault: router({
    documents: protectedProcedure.query(({ ctx }) => listVaultDocuments(ctx.user.id)),
    upload: protectedProcedure.input(z.object({ title: z.string().min(2).max(180), mimeType: z.string().min(3).max(120), base64Data: z.string().min(8).max(15_000_000) })).mutation(async ({ ctx, input }) => {
      try { return await uploadVaultDocument({ ownerId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
    download: protectedProcedure.input(z.object({ documentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      try { return await downloadVaultDocument(ctx.user.id, input.documentId); } catch (error) { return featureError(error); }
    }),
  }),

  agreements: router({
    create: protectedProcedure.input(z.object({ counterpartyId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try { return await createAgreement({ initiatorId: ctx.user.id, counterpartyId: input.counterpartyId }); } catch (error) { return featureError(error); }
    }),
    addTerm: protectedProcedure.input(z.object({ agreementId: z.number().int().positive(), termType: z.string().min(2).max(80), label: z.string().min(2).max(180), value: z.string().min(1).max(4_000) })).mutation(async ({ ctx, input }) => {
      try { return await addAgreementTerm({ actorId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
    sign: protectedProcedure.input(z.object({ agreementId: z.number().int().positive(), consentText: z.string().min(10).max(1_000) })).mutation(async ({ ctx, input }) => {
      try { return await signAgreement({ signerId: ctx.user.id, ...input }); } catch (error) { return featureError(error); }
    }),
    generatePdf: protectedProcedure.input(z.object({ agreementId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try { return await generateAgreementPdf({ userId: ctx.user.id, agreementId: input.agreementId }); } catch (error) { return featureError(error); }
    }),
  }),

  subscriptions: router({
    mine: protectedProcedure.query(({ ctx }) => listMySubscriptions(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
