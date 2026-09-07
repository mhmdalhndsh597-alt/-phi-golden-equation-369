export type CompatibilityProfile = {
  age?: number | null;
  location?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  interests?: string | null;
  skills?: string | null;
  preferredAgeMin?: number | null;
  preferredAgeMax?: number | null;
  preferredLocations?: string | null;
};

function tokens(value?: string | null) {
  return new Set((value ?? "").split(/[,،\n|]/).map((item) => item.trim().toLocaleLowerCase("ar")).filter(Boolean));
}

function overlap(left?: string | null, right?: string | null) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return null;
  const shared = Array.from(a).filter((token) => b.has(token)).length;
  return shared / Math.max(a.size, b.size);
}

function ageFit(age: number | null | undefined, min: number | null | undefined, max: number | null | undefined) {
  if (age == null || (min == null && max == null)) return null;
  if (min != null && age < min) return 0;
  if (max != null && age > max) return 0;
  return 1;
}

export function calculateCompatibility(a: CompatibilityProfile, b: CompatibilityProfile) {
  const checks: Array<{ label: string; score: number | null; weight: number }> = [
    { label: "الفئة العمرية", score: (ageFit(a.age, b.preferredAgeMin, b.preferredAgeMax) ?? ageFit(b.age, a.preferredAgeMin, a.preferredAgeMax)), weight: 0.25 },
    { label: "المدينة أو النطاق الجغرافي", score: overlap(a.location, b.preferredLocations) ?? overlap(b.location, a.preferredLocations), weight: 0.2 },
    { label: "الاهتمامات", score: overlap(a.interests, b.interests), weight: 0.3 },
    { label: "المهارات", score: overlap(a.skills, b.skills), weight: 0.15 },
    { label: "الحالة الاجتماعية", score: a.maritalStatus && b.maritalStatus ? (a.maritalStatus === b.maritalStatus ? 1 : 0.5) : null, weight: 0.1 },
  ];
  const available = checks.filter((check) => check.score != null);
  if (!available.length) return { percentage: 0, reasons: ["أكمل بعض التفضيلات للحصول على نسبة أدق"] };
  const totalWeight = available.reduce((sum, check) => sum + check.weight, 0);
  const weighted = available.reduce((sum, check) => sum + (check.score ?? 0) * check.weight, 0) / totalWeight;
  const reasons = available.filter((check) => (check.score ?? 0) >= 0.6).sort((x, y) => (y.score ?? 0) - (x.score ?? 0)).slice(0, 3).map((check) => check.label);
  return { percentage: Math.round(weighted * 100), reasons: reasons.length ? reasons : ["توجد نقاط تحتاج إلى تعارف وحوار مباشر"] };
}
