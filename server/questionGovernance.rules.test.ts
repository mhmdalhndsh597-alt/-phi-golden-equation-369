import { describe, expect, it } from "vitest";
import { classifyQuestionText, normalizeQuestion, questionHash } from "./questionGovernance";

describe("community question governance", () => {
  it("normalizes equivalent Arabic questions to the same hash", () => {
    expect(normalizeQuestion("ما رأيك في السكن؟")).toBe(normalizeQuestion(" ما رأيك في السكن ")); 
    expect(questionHash("ما رأيك في السكن؟")).toBe(questionHash("ما رأيك في السكن"));
  });

  it("rejects short and unsafe questions before persistence", () => {
    expect(() => classifyQuestionText("هل؟")).toThrow();
    expect(() => classifyQuestionText("هل يوجد تهديد أو ابتزاز في هذا السؤال؟")).toThrow();
    expect(classifyQuestionText("كيف نوضح الالتزامات المالية قبل التقدم؟")).toContain("الالتزامات");
  });
});
