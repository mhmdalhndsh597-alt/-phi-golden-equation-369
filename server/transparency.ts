import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { ENV } from "./_core/env";
import {
  agreementSignatures,
  agreementTerms,
  declarationAcceptances,
  marriageDeclarations,
  premaritalAgreements,
  subscriptions,
  transparencyEvents,
  verifiedAnswers,
  verifiedQuestions,
  vaultDocuments,
} from "../drizzle/schema";

export const LEGAL_DISCLAIMER = "هذه المنصة أداة تقنية لحفظ الإقرارات والاتفاقات بين الأطراف. لا تمثل المنصة جهة قضائية أو محاميًا أو موثقًا رسميًا، ولا تضمن صحة البيانات أو قابلية البنود للنفاذ القانوني. يجب مراجعة مختص قانوني محلي قبل الاعتماد على أي اتفاق.";
export const DECLARATION_ACCEPTANCE = "أقر بأن البيانات التي قدمتها صحيحة حسب علمي، وأتحمل مسؤوليتي الشخصية عن تحديثها وتصحيحها، وأفهم أن المنصة تحفظ الإقرار ولا تتحقق من كل واقعة.";

export function validateDeclarationInput(input: { maritalStatusDetail: string; hasChildren: boolean; childrenCount: number; essentialObligations: string }) {
  if (!input.maritalStatusDetail.trim() || !input.essentialObligations.trim()) throw new Error("Marital status and essential obligations are required");
  if (input.childrenCount < 0 || input.childrenCount > 30 || (!input.hasChildren && input.childrenCount !== 0)) throw new Error("Children data is inconsistent");
  return true;
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonHash(value: unknown) {
  return sha256(JSON.stringify(value));
}

async function appendTransparencyEvent(input: { actorUserId: number; eventType: string; entityType: string; entityId: number; payload: unknown }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const previous = await db.select({ eventHash: transparencyEvents.eventHash }).from(transparencyEvents).orderBy(desc(transparencyEvents.id)).limit(1);
  const previousEventHash = previous[0]?.eventHash ?? null;
  const payloadHash = jsonHash(input.payload);
  const eventHash = sha256(`${previousEventHash ?? "GENESIS"}|${input.actorUserId}|${input.eventType}|${input.entityType}|${input.entityId}|${payloadHash}`);
  await db.insert(transparencyEvents).values({ actorUserId: input.actorUserId, eventType: input.eventType, entityType: input.entityType, entityId: input.entityId, payloadHash, previousEventHash, eventHash });
  return eventHash;
}

export function appendGovernanceEvent(input: { actorUserId: number; eventType: string; entityId: number; payload: unknown }) {
  return appendTransparencyEvent({ ...input, entityType: "question_proposal" });
}

export async function createDeclaration(input: { userId: number; maritalStatusDetail: string; hasChildren: boolean; childrenCount: number; essentialObligations: string; additionalNotes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const maritalStatusDetail = input.maritalStatusDetail.trim().slice(0, 120);
  const essentialObligations = input.essentialObligations.trim().slice(0, 4_000);
  validateDeclarationInput({ maritalStatusDetail, essentialObligations, hasChildren: input.hasChildren, childrenCount: input.childrenCount });
  const latest = await db.select({ version: marriageDeclarations.version }).from(marriageDeclarations).where(eq(marriageDeclarations.userId, input.userId)).orderBy(desc(marriageDeclarations.version)).limit(1);
  const version = (latest[0]?.version ?? 0) + 1;
  const payload = { userId: input.userId, version, maritalStatusDetail, hasChildren: input.hasChildren, childrenCount: input.childrenCount, essentialObligations, additionalNotes: input.additionalNotes?.trim().slice(0, 4_000) ?? null };
  const dataHash = jsonHash(payload);
  await db.update(marriageDeclarations).set({ status: "superseded" }).where(and(eq(marriageDeclarations.userId, input.userId), eq(marriageDeclarations.status, "confirmed")));
  const inserted = await db.insert(marriageDeclarations).values({ ...payload, hasChildren: input.hasChildren ? 1 : 0, dataHash, status: "confirmed" });
  const declarationId = Number(inserted[0].insertId);
  await db.insert(declarationAcceptances).values({ declarationId, userId: input.userId, acceptanceText: DECLARATION_ACCEPTANCE, dataHash });
  await appendTransparencyEvent({ actorUserId: input.userId, eventType: "declaration_confirmed", entityType: "marriage_declaration", entityId: declarationId, payload });
  return db.select().from(marriageDeclarations).where(eq(marriageDeclarations.id, declarationId)).limit(1).then((rows) => rows[0]);
}

export async function listMyDeclarations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marriageDeclarations).where(eq(marriageDeclarations.userId, userId)).orderBy(desc(marriageDeclarations.version));
}

export async function createVerifiedQuestion(input: { askerId: number; respondentId: number; conversationKey: string; category: string; question: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.askerId === input.respondentId) throw new Error("A verified question requires two participants");
  const question = input.question.trim().slice(0, 2_000);
  if (!question) throw new Error("Question is required");
  const inserted = await db.insert(verifiedQuestions).values({ askerId: input.askerId, respondentId: input.respondentId, conversationKey: input.conversationKey.trim().slice(0, 160), category: input.category.trim().slice(0, 80), question, questionHash: sha256(question) });
  const id = Number(inserted[0].insertId);
  await appendTransparencyEvent({ actorUserId: input.askerId, eventType: "verified_question_created", entityType: "verified_question", entityId: id, payload: { question, respondentId: input.respondentId } });
  return { id };
}

export async function answerVerifiedQuestion(input: { respondentId: number; questionId: number; answer: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const question = (await db.select().from(verifiedQuestions).where(eq(verifiedQuestions.id, input.questionId)).limit(1))[0];
  if (!question || question.respondentId !== input.respondentId) throw new Error("Only the designated respondent can answer this question");
  const answer = input.answer.trim().slice(0, 4_000);
  if (!answer) throw new Error("Answer is required");
  const existing = await db.select({ id: verifiedAnswers.id }).from(verifiedAnswers).where(eq(verifiedAnswers.questionId, input.questionId)).limit(1);
  if (existing[0]) throw new Error("This verified question already has an immutable answer");
  const answerHash = sha256(answer);
  const inserted = await db.insert(verifiedAnswers).values({ questionId: input.questionId, respondentId: input.respondentId, answer, answerHash });
  const id = Number(inserted[0].insertId);
  await appendTransparencyEvent({ actorUserId: input.respondentId, eventType: "verified_answer_created", entityType: "verified_answer", entityId: id, payload: { questionId: input.questionId, answerHash } });
  return { id, answerHash };
}

export async function listVerifiedConversation(userId: number, conversationKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ question: verifiedQuestions, answer: verifiedAnswers }).from(verifiedQuestions).leftJoin(verifiedAnswers, eq(verifiedAnswers.questionId, verifiedQuestions.id)).where(and(eq(verifiedQuestions.conversationKey, conversationKey), or(eq(verifiedQuestions.askerId, userId), eq(verifiedQuestions.respondentId, userId)))).orderBy(verifiedQuestions.createdAt);
}

function vaultKey(secret = ENV.vaultEncryptionKey) {
  if (!secret) throw new Error("VAULT_ENCRYPTION_KEY is not configured");
  return createHash("sha256").update(secret).digest();
}

export function encryptVaultPayload(buffer: Buffer, secret = ENV.vaultEncryptionKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { encrypted: Buffer.concat([iv, ciphertext, cipher.getAuthTag()]), iv: iv.toString("hex"), authTag: cipher.getAuthTag().toString("hex") };
}

export function decryptVaultPayload(buffer: Buffer, secret = ENV.vaultEncryptionKey) {
  if (buffer.length < 28) throw new Error("Encrypted vault payload is invalid");
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(buffer.length - 16);
  const ciphertext = buffer.subarray(12, buffer.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", vaultKey(secret), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function uploadVaultDocument(input: { ownerId: number; title: string; mimeType: string; base64Data: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const raw = Buffer.from(input.base64Data.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (!raw.length || raw.length > 10 * 1024 * 1024) throw new Error("Vault files must be between 1 byte and 10 MB");
  const encrypted = encryptVaultPayload(raw);
  const uploaded = await storagePut(`vault/${input.ownerId}/${randomBytes(12).toString("hex")}.bin`, encrypted.encrypted, "application/octet-stream");
  const inserted = await db.insert(vaultDocuments).values({ ownerId: input.ownerId, title: input.title.trim().slice(0, 180), mimeType: input.mimeType.slice(0, 120), storageKey: uploaded.key, sha256: sha256(raw), iv: encrypted.iv, authTag: encrypted.authTag, sizeBytes: raw.length });
  const id = Number(inserted[0].insertId);
  await appendTransparencyEvent({ actorUserId: input.ownerId, eventType: "vault_document_created", entityType: "vault_document", entityId: id, payload: { title: input.title, sha256: sha256(raw), sizeBytes: raw.length } });
  return { id, title: input.title, sha256: sha256(raw), sizeBytes: raw.length };
}

export async function listVaultDocuments(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: vaultDocuments.id, title: vaultDocuments.title, mimeType: vaultDocuments.mimeType, sha256: vaultDocuments.sha256, sizeBytes: vaultDocuments.sizeBytes, createdAt: vaultDocuments.createdAt }).from(vaultDocuments).where(eq(vaultDocuments.ownerId, ownerId)).orderBy(desc(vaultDocuments.createdAt));
}

export async function downloadVaultDocument(ownerId: number, documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const document = (await db.select().from(vaultDocuments).where(and(eq(vaultDocuments.id, documentId), eq(vaultDocuments.ownerId, ownerId))).limit(1))[0];
  if (!document) throw new Error("Vault document not found");
  const response = await fetch(await storageGetSignedUrl(document.storageKey));
  if (!response.ok) throw new Error("Vault file could not be retrieved");
  const decrypted = decryptVaultPayload(Buffer.from(await response.arrayBuffer()));
  if (sha256(decrypted) !== document.sha256) throw new Error("Vault integrity check failed");
  return { id: document.id, title: document.title, mimeType: document.mimeType, base64Data: decrypted.toString("base64") };
}

export async function createAgreement(input: { initiatorId: number; counterpartyId: number; contentHash?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.initiatorId === input.counterpartyId) throw new Error("An agreement requires two different participants");
  const contentHash = input.contentHash ?? jsonHash({ initiatorId: input.initiatorId, counterpartyId: input.counterpartyId, version: 1 });
  const inserted = await db.insert(premaritalAgreements).values({ initiatorId: input.initiatorId, counterpartyId: input.counterpartyId, contentHash, legalDisclaimer: LEGAL_DISCLAIMER });
  const id = Number(inserted[0].insertId);
  await appendTransparencyEvent({ actorUserId: input.initiatorId, eventType: "agreement_created", entityType: "premarital_agreement", entityId: id, payload: { counterpartyId: input.counterpartyId, contentHash } });
  return { id, contentHash, legalDisclaimer: LEGAL_DISCLAIMER };
}

export async function addAgreementTerm(input: { actorId: number; agreementId: number; termType: string; label: string; value: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const agreement = (await db.select().from(premaritalAgreements).where(eq(premaritalAgreements.id, input.agreementId)).limit(1))[0];
  if (!agreement || (agreement.initiatorId !== input.actorId && agreement.counterpartyId !== input.actorId)) throw new Error("Agreement access denied");
  if (["locked", "archived"].includes(agreement.status)) throw new Error("Locked agreements cannot be edited");
  const inserted = await db.insert(agreementTerms).values({ agreementId: input.agreementId, version: agreement.version, termType: input.termType.slice(0, 80), label: input.label.slice(0, 180), value: input.value.slice(0, 4_000) });
  return { id: Number(inserted[0].insertId) };
}

export async function signAgreement(input: { signerId: number; agreementId: number; consentText: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const agreement = (await db.select().from(premaritalAgreements).where(eq(premaritalAgreements.id, input.agreementId)).limit(1))[0];
  if (!agreement || (agreement.initiatorId !== input.signerId && agreement.counterpartyId !== input.signerId)) throw new Error("Agreement access denied");
  if (["locked", "archived"].includes(agreement.status)) throw new Error("Agreement is already locked");
  const existing = await db.select({ id: agreementSignatures.id }).from(agreementSignatures).where(and(eq(agreementSignatures.agreementId, input.agreementId), eq(agreementSignatures.signerId, input.signerId), eq(agreementSignatures.version, agreement.version))).limit(1);
  if (existing[0]) throw new Error("This participant has already signed this version");
  const terms = await db.select().from(agreementTerms).where(and(eq(agreementTerms.agreementId, input.agreementId), eq(agreementTerms.version, agreement.version))).orderBy(agreementTerms.id);
  const contentHash = jsonHash({ agreementId: agreement.id, version: agreement.version, terms });
  await db.insert(agreementSignatures).values({ agreementId: agreement.id, signerId: input.signerId, version: agreement.version, contentHash, consentText: input.consentText.trim().slice(0, 1_000) });
  const signatures = await db.select({ id: agreementSignatures.id }).from(agreementSignatures).where(and(eq(agreementSignatures.agreementId, agreement.id), eq(agreementSignatures.version, agreement.version)));
  const status = signatures.length >= 2 ? "locked" : "accepted_by_one";
  await db.update(premaritalAgreements).set({ status, contentHash }).where(eq(premaritalAgreements.id, agreement.id));
  await appendTransparencyEvent({ actorUserId: input.signerId, eventType: "agreement_signed", entityType: "premarital_agreement", entityId: agreement.id, payload: { version: agreement.version, contentHash } });
  return { agreementId: agreement.id, status, contentHash };
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
}

export function buildAgreementPdf(lines: string[]) {
  const safeLines = lines.slice(0, 120).map((line) => pdfEscape(line.slice(0, 180)));
  const commands = ["BT", "/F1 11 Tf", "50 790 Td", ...safeLines.flatMap((line, index) => [index === 0 ? `(${line}) Tj` : `0 -16 Td (${line}) Tj`]), "ET"].join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export async function generateAgreementPdf(input: { userId: number; agreementId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const agreement = (await db.select().from(premaritalAgreements).where(eq(premaritalAgreements.id, input.agreementId)).limit(1))[0];
  if (!agreement || (agreement.initiatorId !== input.userId && agreement.counterpartyId !== input.userId)) throw new Error("Agreement access denied");
  const terms = await db.select().from(agreementTerms).where(and(eq(agreementTerms.agreementId, agreement.id), eq(agreementTerms.version, agreement.version))).orderBy(agreementTerms.id);
  const declarations = await db.select({ userId: marriageDeclarations.userId, dataHash: marriageDeclarations.dataHash, version: marriageDeclarations.version }).from(marriageDeclarations).where(or(eq(marriageDeclarations.userId, agreement.initiatorId), eq(marriageDeclarations.userId, agreement.counterpartyId))).orderBy(desc(marriageDeclarations.version));
  const lines = ["PHI - THE GOLDEN EQUATION", "Verified Premarital Agreement", `Agreement #${agreement.id} · Version ${agreement.version}`, `Status: ${agreement.status}`, `Content hash: ${agreement.contentHash}`, "", "Declarations included:", ...declarations.slice(0, 2).map((item) => `User ${item.userId} · declaration v${item.version} · ${item.dataHash}`), "", "Terms:", ...terms.map((term) => `${term.label}: ${term.value}`), "", LEGAL_DISCLAIMER];
  const pdf = buildAgreementPdf(lines);
  return uploadVaultDocument({ ownerId: input.userId, title: `phi-agreement-${agreement.id}-v${agreement.version}.pdf`, mimeType: "application/pdf", base64Data: `data:application/pdf;base64,${pdf.toString("base64")}` });
}

export async function listMySubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
}
