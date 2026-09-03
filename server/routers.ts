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
  getProfile,
  listAdminPosts,
  listAdminUsers,
  listAdminGifts,
  getWalletBalance,
  updateProfile,
  sendGiftAtomic,
  sendMessage,
  toggleInteraction,
} from "./db";

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

  admin: router({
    users: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).optional()).query(({ input }) => listAdminUsers(input?.limit ?? 100)),
    posts: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).optional()).query(({ input }) => listAdminPosts(input?.limit ?? 100)),
    gifts: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).optional()).query(({ input }) => listAdminGifts(input?.limit ?? 100)),
  }),

  profile: router({
    me: protectedProcedure.query(({ ctx }) => getProfile(ctx.user.id)),
    update: protectedProcedure
      .input(z.object({ name: z.string().max(160).optional(), bio: z.string().max(2_000).optional(), age: z.number().int().optional(), location: z.string().max(120).optional(), gender: z.enum(["male", "female", "other"]).optional(), curriculumVitae: z.string().max(4_000).optional(), specifications: z.string().max(2_000).optional(), skills: z.string().max(1_000).optional(), occupation: z.string().max(160).optional(), education: z.string().max(160).optional(), maritalStatus: z.enum(["single", "divorced", "widowed"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateProfile(ctx.user.id, input);
        } catch (error) {
          return featureError(error);
        }
      }),
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

  gifts: router({
    catalog: publicProcedure.query(() => listActiveGifts()),
    send: protectedProcedure
      .input(z.object({
        recipientId: z.number().int().positive(),
        giftId: z.number().int().positive(),
        commentId: z.number().int().positive().optional(),
        messageId: z.number().int().positive().optional(),
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
});

export type AppRouter = typeof appRouter;
