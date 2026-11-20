import { createHash } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { questionProposalVotes, questionProposals, users } from "../drizzle/schema";
import { getDb } from "./db";
import { appendGovernanceEvent } from "./transparency";

export type QuestionCategory = "financial" | "social" | "family" | "special_conditions";
export type QuestionProposalStatus = "pending" | "approved_library" | "approved_popular" | "rejected";
const forbiddenTerms = ["شتيمة", "إباحي", "اباحي", "تهديد", "ابتزاز", "عنصري"];

export function normalizeQuestion(value: string) {
  return value.trim().toLocaleLowerCase("ar").replace(/[؟?!.،,:;]+/g, " ").replace(/\s+/g, " ").trim();
}

export function classifyQuestionText(question: string) {
  const normalized = normalizeQuestion(question);
  if (normalized.length < 12) throw new Error("Question is too short");
  if (normalized.length > 500) throw new Error("Question is too long");
  if (forbiddenTerms.some((term) => normalized.includes(term))) throw new Error("Question contains language that cannot be published");
  return normalized;
}

export function questionHash(question: string) {
  return createHash("sha256").update(normalizeQuestion(question)).digest("hex");
}

async function voteCount(proposalId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(questionProposalVotes).where(eq(questionProposalVotes.proposalId, proposalId));
  return Number(result[0]?.count ?? 0);
}

export async function proposeQuestion(input: { proposerId: number; category: QuestionCategory; question: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = classifyQuestionText(input.question);
  const normalizedHash = questionHash(normalized);
  const existing = await db.select({ id: questionProposals.id, status: questionProposals.status }).from(questionProposals).where(eq(questionProposals.normalizedHash, normalizedHash)).limit(1);
  if (existing[0]) throw new Error(existing[0].status === "rejected" ? "This question was already reviewed and rejected" : "A matching question already exists");
  const inserted = await db.insert(questionProposals).values({ proposerId: input.proposerId, category: input.category, question: input.question.trim().slice(0, 500), normalizedHash, status: "pending" });
  const id = Number(inserted[0].insertId);
  await appendGovernanceEvent({ actorUserId: input.proposerId, eventType: "question_proposed", entityId: id, payload: { category: input.category, normalizedHash } });
  return { id, status: "pending" as const };
}

export async function toggleQuestionVote(input: { userId: number; proposalId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const proposal = (await db.select({ id: questionProposals.id, status: questionProposals.status }).from(questionProposals).where(eq(questionProposals.id, input.proposalId)).limit(1))[0];
  if (!proposal || proposal.status === "rejected") throw new Error("This question is not available for voting");
  const existing = await db.select({ id: questionProposalVotes.id }).from(questionProposalVotes).where(and(eq(questionProposalVotes.proposalId, input.proposalId), eq(questionProposalVotes.userId, input.userId))).limit(1);
  if (existing[0]) await db.delete(questionProposalVotes).where(eq(questionProposalVotes.id, existing[0].id));
  else await db.insert(questionProposalVotes).values({ proposalId: input.proposalId, userId: input.userId });
  return { active: !existing[0], votes: await voteCount(input.proposalId) };
}

async function withVotes(rows: Array<{ proposal: typeof questionProposals.$inferSelect; proposer: typeof users.$inferSelect | null }>) {
  return Promise.all(rows.map(async ({ proposal, proposer }) => ({ ...proposal, proposer: proposer ? { id: proposer.id, name: proposer.name, transparencyPoints: proposer.transparencyPoints } : null, votes: await voteCount(proposal.id) })));
}

export async function listPublicQuestionLibrary() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ proposal: questionProposals, proposer: users }).from(questionProposals).leftJoin(users, eq(users.id, questionProposals.proposerId)).where(sql`${questionProposals.status} in ('approved_library', 'approved_popular')`).orderBy(desc(questionProposals.status), desc(questionProposals.createdAt));
  return withVotes(rows);
}

export async function listPopularQuestions() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ proposal: questionProposals, proposer: users }).from(questionProposals).leftJoin(users, eq(users.id, questionProposals.proposerId)).where(eq(questionProposals.status, "approved_popular")).orderBy(desc(questionProposals.createdAt)).limit(30);
  return withVotes(rows);
}

export async function listAdminQuestionProposals() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ proposal: questionProposals, proposer: users }).from(questionProposals).leftJoin(users, eq(users.id, questionProposals.proposerId)).orderBy(desc(questionProposals.createdAt)).limit(200);
  return withVotes(rows);
}

export async function reviewQuestionProposal(input: { adminId: number; proposalId: number; status: Exclude<QuestionProposalStatus, "pending">; rejectionReason?: string; editedQuestion?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const proposal = (await db.select().from(questionProposals).where(eq(questionProposals.id, input.proposalId)).limit(1))[0];
  if (!proposal) throw new Error("Question proposal not found");
  if (input.status === "rejected" && !input.rejectionReason?.trim()) throw new Error("A rejection reason is required");
  const question = input.editedQuestion ? classifyQuestionText(input.editedQuestion) : proposal.question;
  const editedHash = questionHash(question);
  const duplicate = await db.select({ id: questionProposals.id }).from(questionProposals).where(and(eq(questionProposals.normalizedHash, editedHash), sql`${questionProposals.id} <> ${input.proposalId}`)).limit(1);
  if (duplicate[0]) throw new Error("The edited question duplicates another proposal");
  await db.update(questionProposals).set({ status: input.status, question, normalizedHash: editedHash, rejectionReason: input.status === "rejected" ? input.rejectionReason!.trim().slice(0, 180) : null, reviewedBy: input.adminId, reviewedAt: new Date() }).where(eq(questionProposals.id, input.proposalId));
  const acceptedNow = input.status === "approved_library" || input.status === "approved_popular";
  const wasAlreadyAccepted = proposal.status === "approved_library" || proposal.status === "approved_popular";
  if (acceptedNow && !wasAlreadyAccepted) await db.update(users).set({ transparencyPoints: sql`${users.transparencyPoints} + 1` }).where(eq(users.id, proposal.proposerId));
  await appendGovernanceEvent({ actorUserId: input.adminId, eventType: `question_${input.status}`, entityId: input.proposalId, payload: { questionHash: editedHash, rejectionReason: input.rejectionReason ?? null } });
  return { success: true as const, status: input.status, questionHash: editedHash };
}
