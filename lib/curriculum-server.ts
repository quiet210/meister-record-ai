import { createSupabaseServiceClient, getSchoolId } from "@/lib/supabase-server";
import type { CurriculumStandard, CurriculumStandardStatus, CurriculumSubjectType } from "@/lib/curriculum";
import type { SubjectRecordFormPayload } from "@/lib/types";

type CurriculumStandardRow = {
  id: string;
  school_id: string;
  subject_id: string;
  subject_name: string;
  subject_type: CurriculumSubjectType;
  unit_name: string;
  achievement_standard: string;
  keywords: string | null;
  uploaded_by: string | null;
  status: CurriculumStandardStatus;
  duplicate_status: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

type GetCurriculumStandardsBySubjectOptions = {
  schoolId?: string;
};

type SubjectCurriculumSelectionInput = Omit<SubjectRecordFormPayload, "mode">;

type ScoredCurriculumStandard = {
  standard: CurriculumStandard;
  relevanceScore: number;
};

const standardColumns =
  "id, school_id, subject_id, subject_name, subject_type, unit_name, achievement_standard, keywords, uploaded_by, status, duplicate_status, sort_order, created_at, updated_at";

function normalizeExactValue(value?: string | null) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function normalizeStandard(row: CurriculumStandardRow): CurriculumStandard {
  return {
    id: row.id,
    schoolId: row.school_id,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    subjectType: row.subject_type,
    unitName: row.unit_name,
    achievementStandard: row.achievement_standard,
    keywords: row.keywords || "",
    uploadedBy: row.uploaded_by,
    status: row.status,
    duplicateStatus: row.duplicate_status || "none",
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeSearchText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function compactSearchText(value?: string | null) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function uniqueTokens(values: Array<string | undefined | null>) {
  const tokens = new Set<string>();

  values.forEach((value) => {
    normalizeSearchText(value)
      .split(/\s+/)
      .filter((token) => token.length >= 2)
      .forEach((token) => tokens.add(token));
  });

  return tokens;
}

function countTokenOverlap(candidateText: string, inputTokens: Set<string>) {
  if (inputTokens.size === 0) return 0;
  const candidateTokens = uniqueTokens([candidateText]);
  let count = 0;

  candidateTokens.forEach((token) => {
    if (inputTokens.has(token)) count += 1;
  });

  return count;
}

function phraseMatchScore(candidateText: string, inputValues: Array<string | undefined | null>, weight: number) {
  const candidateCompact = compactSearchText(candidateText);
  if (candidateCompact.length < 2) return 0;

  return inputValues.reduce((score, value) => {
    const inputCompact = compactSearchText(value);
    if (inputCompact.length < 2) return score;
    if (inputCompact === candidateCompact) return score + weight * 2;
    if (inputCompact.includes(candidateCompact) || candidateCompact.includes(inputCompact)) return score + weight;
    return score;
  }, 0);
}

function scoreCurriculumStandard(standard: CurriculumStandard, input: SubjectCurriculumSelectionInput) {
  const unitInputs = [input.unit];
  const activityInputs = [...(input.activityTypes || []), ...(input.competencies || []), ...(input.improvements || [])];
  const allInputValues = [input.subjectName, input.unit, input.observationMemo, ...activityInputs];
  const allInputTokens = uniqueTokens(allInputValues);
  const unitTokens = uniqueTokens(unitInputs);
  const activityTokens = uniqueTokens(activityInputs);

  let score = 0;
  score += phraseMatchScore(standard.unitName, unitInputs, 18);
  score += phraseMatchScore(standard.keywords, allInputValues, 8);
  score += phraseMatchScore(standard.achievementStandard, allInputValues, 4);
  score += countTokenOverlap(standard.unitName, unitTokens) * 10;
  score += countTokenOverlap(standard.unitName, allInputTokens) * 4;
  score += countTokenOverlap(standard.keywords, activityTokens) * 7;
  score += countTokenOverlap(standard.keywords, allInputTokens) * 4;
  score += countTokenOverlap(standard.achievementStandard, allInputTokens) * 2;

  return score;
}

function getTodaySeedDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

function buildCurriculumSelectionSeed(input: SubjectCurriculumSelectionInput) {
  return [
    input.selectedStudentId ? `selectedStudentId:${normalizeExactValue(input.selectedStudentId)}` : "",
    input.studentNo ? `student_no:${normalizeExactValue(input.studentNo)}` : "",
    input.studentName ? `studentName:${normalizeExactValue(input.studentName)}` : "",
    `date:${getTodaySeedDate()}`
  ]
    .filter(Boolean)
    .join("|");
}

function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: string) {
  let state = hashSeed(seed) || 0x9e3779b9;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedSampleWithoutReplacement(pool: ScoredCurriculumStandard[], seed: string, count: number) {
  const random = createSeededRandom(seed);
  const remaining = [...pool];
  const selected: ScoredCurriculumStandard[] = [];

  while (remaining.length > 0 && selected.length < count) {
    const totalWeight = remaining.reduce((sum, item) => sum + Math.max(1, item.relevanceScore + 1), 0);
    let threshold = random() * totalWeight;
    const selectedIndex = remaining.findIndex((item) => {
      threshold -= Math.max(1, item.relevanceScore + 1);
      return threshold <= 0;
    });
    const index = selectedIndex >= 0 ? selectedIndex : remaining.length - 1;
    const [item] = remaining.splice(index, 1);
    selected.push(item);
  }

  return selected;
}

function selectCurriculumStandards(standards: CurriculumStandard[], input: SubjectCurriculumSelectionInput, seed: string) {
  if (standards.length <= 3) return standards;

  const scored = standards
    .map((standard) => ({
      standard,
      relevanceScore: scoreCurriculumStandard(standard, input)
    }))
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      if (a.standard.sortOrder !== b.standard.sortOrder) return a.standard.sortOrder - b.standard.sortOrder;
      return a.standard.id.localeCompare(b.standard.id);
    });

  const positiveScored = scored.filter((item) => item.relevanceScore > 0);
  const rankedPool = positiveScored.length > 0 ? positiveScored : scored;
  const topScore = rankedPool[0]?.relevanceScore ?? 0;
  const scoreCutoff = topScore > 0 ? Math.max(1, topScore * 0.45) : 0;
  let highRelevancePool = topScore > 0 ? rankedPool.filter((item) => item.relevanceScore >= scoreCutoff) : rankedPool;
  const minimumPoolSize = Math.min(rankedPool.length, 6);

  if (highRelevancePool.length < minimumPoolSize) {
    highRelevancePool = rankedPool.slice(0, minimumPoolSize);
  }

  const maxPoolSize = Math.min(rankedPool.length, Math.max(3, Math.min(12, Math.ceil(rankedPool.length * 0.5))));
  highRelevancePool = highRelevancePool.slice(0, maxPoolSize);

  return weightedSampleWithoutReplacement(highRelevancePool, seed, 3)
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      if (a.standard.sortOrder !== b.standard.sortOrder) return a.standard.sortOrder - b.standard.sortOrder;
      return a.standard.id.localeCompare(b.standard.id);
    })
    .map((item) => item.standard);
}

export async function getCurriculumStandardsBySubject(subjectName: string, options?: GetCurriculumStandardsBySubjectOptions) {
  const normalizedSubjectName = normalizeExactValue(subjectName);
  const schoolId = normalizeExactValue(options?.schoolId || getSchoolId());
  if (!normalizedSubjectName || !schoolId) return { standards: [] as CurriculumStandard[], totalCount: 0 };

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      standards: [] as CurriculumStandard[],
      totalCount: 0,
      error: "Supabase 서버 키가 없어 성취기준 조회를 건너뛰었습니다."
    };
  }

  const { data, error, count } = await supabase
    .from("curriculum_standards")
    .select(standardColumns, { count: "exact" })
    .eq("school_id", schoolId)
    .eq("status", "active")
    .eq("subject_name", normalizedSubjectName)
    .order("unit_name", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return {
      standards: [] as CurriculumStandard[],
      totalCount: 0,
      error: `과목별 성취기준 검색 실패: ${error.message}`
    };
  }

  return {
    standards: ((data || []) as CurriculumStandardRow[]).map(normalizeStandard),
    totalCount: count ?? data?.length ?? 0
  };
}

export async function selectCurriculumStandardsForSubjectComment(input: SubjectCurriculumSelectionInput) {
  const seed = buildCurriculumSelectionSeed(input);
  const result = await getCurriculumStandardsBySubject(input.subjectName, {
    schoolId: input.schoolId
  });

  if (result.error || result.standards.length === 0) {
    return {
      standards: [] as CurriculumStandard[],
      totalCount: result.totalCount,
      seed,
      error: result.error
    };
  }

  return {
    standards: selectCurriculumStandards(result.standards, input, seed),
    totalCount: result.totalCount,
    seed,
    error: result.error
  };
}
