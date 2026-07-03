import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ensureUserProfile, type UserProfile } from "@/lib/students";

export type CurriculumSubjectType = "general" | "ncs";

export type CurriculumSubject = {
  id: string;
  schoolId: string;
  subjectName: string;
  subjectType: CurriculumSubjectType;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CurriculumStandardStatus = "active" | "pending" | "rejected";

export type CurriculumStandard = {
  id: string;
  schoolId: string;
  subjectId: string;
  subjectName: string;
  subjectType: CurriculumSubjectType;
  learningModule: string;
  unitName: string;
  achievementStandard: string;
  keywords: string;
  uploadedBy: string | null;
  status: CurriculumStandardStatus;
  duplicateStatus: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CurriculumUploadRawRow = {
  rowNumber: number;
  subjectName: string;
  subjectTypeLabel: string;
  learningModule: string;
  unitName: string;
  achievementStandard: string;
  keywords: string;
};

export type CurriculumUploadRowStatus =
  | "valid"
  | "existing_subject"
  | "new_subject"
  | "exact_duplicate"
  | "similar_duplicate"
  | "subject_type_conflict"
  | "error";

export type CurriculumUploadPreviewRow = CurriculumUploadRawRow & {
  subjectId?: string;
  subjectType?: CurriculumSubjectType;
  normalizedSubjectName: string;
  status: CurriculumUploadRowStatus;
  messages: string[];
  similarMatches: string[];
  duplicateStatus: string;
  sortOrder: number;
};

export type CurriculumUploadSummary = {
  totalRows: number;
  newRows: number;
  existingSubjectRows: number;
  newSubjectRows: number;
  exactDuplicateRows: number;
  similarDuplicateRows: number;
  subjectTypeConflictRows: number;
  errorRows: number;
};

export type CurriculumUploadSaveOption = "new_only" | "include_similar";

export type CreateCurriculumStandardInput = {
  subjectId?: string;
  subjectName: string;
  subjectType: CurriculumSubjectType;
  learningModule: string;
  unitName: string;
  achievementStandard: string;
  keywords: string;
  duplicateStatus: string;
  sortOrder: number;
};

export type SaveCurriculumUploadResult = {
  savedRows: number;
  createdSubjectCount: number;
  reusedSubjectCount: number;
  skippedDuplicateRows: number;
  error?: string;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type CurriculumContext = {
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;
  profile: UserProfile;
};

type CurriculumSubjectRow = {
  id: string;
  school_id: string;
  subject_name: string;
  subject_type: CurriculumSubjectType;
  description: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

type CurriculumStandardRow = {
  id: string;
  school_id: string;
  subject_id: string;
  subject_name: string;
  subject_type: CurriculumSubjectType;
  learning_module: string | null;
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

const subjectColumns = "id, school_id, subject_name, subject_type, description, sort_order, created_at, updated_at";
const standardColumns =
  "id, school_id, subject_id, subject_name, subject_type, learning_module, unit_name, achievement_standard, keywords, uploaded_by, status, duplicate_status, sort_order, created_at, updated_at";

export const curriculumSubjectTypeLabels: Record<CurriculumSubjectType, string> = {
  general: "일반교과",
  ncs: "NCS교과"
};

function formatCurriculumError(action: string, error: SupabaseErrorLike) {
  const message = error.message || "알 수 없는 Supabase 오류가 발생했습니다.";
  const context = [error.details, error.hint, error.code ? `code: ${error.code}` : ""].filter(Boolean).join(" / ");
  const rlsHint = /row-level security|rls|permission denied/i.test(`${message} ${context}`)
    ? " RLS 정책 또는 사용자 role/school_id 설정을 확인하세요."
    : "";

  return `${action} 실패: ${message}${context ? ` (${context})` : ""}${rlsHint}`;
}

async function getCurriculumContext(): Promise<{ context?: CurriculumContext; error?: string }> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { error: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) {
    return { error: profileResult.error || "사용자 프로필을 찾지 못했습니다." };
  }

  return { context: { supabase, profile: profileResult.profile } };
}

async function getAdminCurriculumContext(): Promise<{ context?: CurriculumContext; error?: string }> {
  const result = await getCurriculumContext();
  if (!result.context) return result;
  if (result.context.profile.role !== "admin") return { error: "관리자 권한이 필요합니다." };
  return result;
}

function normalizeSubject(row: CurriculumSubjectRow): CurriculumSubject {
  return {
    id: row.id,
    schoolId: row.school_id,
    subjectName: row.subject_name,
    subjectType: row.subject_type,
    description: row.description || "",
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeStandard(row: CurriculumStandardRow): CurriculumStandard {
  return {
    id: row.id,
    schoolId: row.school_id,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    subjectType: row.subject_type,
    learningModule: row.learning_module || "",
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

export function normalizeCurriculumSubjectType(value: string): CurriculumSubjectType | null {
  const compact = value.trim().replace(/\s+/g, "").toLowerCase();
  if (["일반교과", "일반", "general"].includes(compact)) return "general";
  if (["ncs교과", "ncs", "엔씨에스", "엔시에스"].includes(compact)) return "ncs";
  return null;
}

export function normalizeCurriculumHeader(value: string) {
  return value.trim().replace(/\s+/g, "").replace(/[_-]+/g, "").toLowerCase();
}

export function normalizeAchievementText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeExactValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCurriculumSubjectNameForComparison(value: string) {
  return normalizeExactValue(value).toLowerCase();
}

function exactDuplicateKey(input: { subjectName: string; learningModule: string; unitName: string; achievementStandard: string }) {
  return [
    normalizeExactValue(input.subjectName),
    normalizeExactValue(input.learningModule),
    normalizeExactValue(input.unitName),
    normalizeExactValue(input.achievementStandard)
  ].join("\u001f");
}

function unitKey(value: string) {
  return normalizeExactValue(value).toLowerCase();
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + substitutionCost);
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

export function getTextSimilarity(a: string, b: string) {
  if (!a && !b) return 1;
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 0;
  return (maxLength - levenshteinDistance(a, b)) / maxLength;
}

function isSimilarAchievementText(a: string, b: string) {
  if (!a || !b || a === b) return false;
  const minLength = Math.min(a.length, b.length);
  const maxLength = Math.max(a.length, b.length);
  if (minLength < 12) return false;
  if ((a.includes(b) || b.includes(a)) && minLength / maxLength >= 0.85) return true;
  return getTextSimilarity(a, b) >= 0.85;
}

export function buildCurriculumUploadSummary(rows: CurriculumUploadPreviewRow[]): CurriculumUploadSummary {
  return {
    totalRows: rows.length,
    newRows: rows.filter((row) => row.status === "valid" || row.status === "existing_subject" || row.status === "new_subject").length,
    existingSubjectRows: rows.filter((row) => row.status === "existing_subject").length,
    newSubjectRows: rows.filter((row) => row.status === "new_subject").length,
    exactDuplicateRows: rows.filter((row) => row.status === "exact_duplicate").length,
    similarDuplicateRows: rows.filter((row) => row.status === "similar_duplicate").length,
    subjectTypeConflictRows: rows.filter((row) => row.status === "subject_type_conflict").length,
    errorRows: rows.filter((row) => row.status === "error").length
  };
}

export function buildCurriculumStandardInputs(rows: CurriculumUploadPreviewRow[], option: CurriculumUploadSaveOption): CreateCurriculumStandardInput[] {
  return rows.flatMap((row) => {
    const isSaveableStatus = row.status === "valid" || row.status === "existing_subject" || row.status === "new_subject";
    if (!isSaveableStatus && !(option === "include_similar" && row.status === "similar_duplicate")) return [];
    if (!row.subjectType) return [];

    return [
      {
        subjectId: row.subjectId,
        subjectName: normalizeExactValue(row.subjectName),
        subjectType: row.subjectType,
        learningModule: normalizeExactValue(row.learningModule),
        unitName: normalizeExactValue(row.unitName),
        achievementStandard: normalizeExactValue(row.achievementStandard),
        keywords: normalizeExactValue(row.keywords),
        duplicateStatus: row.status === "similar_duplicate" ? "similar_included" : row.duplicateStatus,
        sortOrder: row.sortOrder
      }
    ];
  });
}

export function previewCurriculumUploadRows(inputRows: CurriculumUploadRawRow[], subjects: CurriculumSubject[], standards: CurriculumStandard[]) {
  const subjectByName = new Map<string, CurriculumSubject>();
  subjects.forEach((subject) => {
    const subjectKey = normalizeCurriculumSubjectNameForComparison(subject.subjectName);
    if (subjectKey && !subjectByName.has(subjectKey)) subjectByName.set(subjectKey, subject);
  });

  const uploadedSubjectTypeByKey = new Map<string, Set<CurriculumSubjectType>>();
  const uploadedSubjectDisplayByKey = new Map<string, string>();
  inputRows.forEach((rawRow) => {
    const subjectName = normalizeExactValue(rawRow.subjectName);
    const subjectKey = normalizeCurriculumSubjectNameForComparison(subjectName);
    const subjectType = normalizeCurriculumSubjectType(rawRow.subjectTypeLabel);
    if (!subjectKey) return;
    if (!uploadedSubjectDisplayByKey.has(subjectKey)) uploadedSubjectDisplayByKey.set(subjectKey, subjectName);
    if (!subjectType) return;

    const subjectTypes = uploadedSubjectTypeByKey.get(subjectKey) || new Set<CurriculumSubjectType>();
    subjectTypes.add(subjectType);
    uploadedSubjectTypeByKey.set(subjectKey, subjectTypes);
  });

  const subjectTypeConflictKeys = new Set(
    Array.from(uploadedSubjectTypeByKey.entries())
      .filter(([, subjectTypes]) => subjectTypes.size > 1)
      .map(([subjectKey]) => subjectKey)
  );

  const existingExactKeys = new Set(standards.map(exactDuplicateKey));
  const seenExactKeys = new Set<string>();
  const comparableRows = standards.map((standard) => ({
    subjectNameKey: normalizeCurriculumSubjectNameForComparison(standard.subjectName),
    learningModuleKey: normalizeCurriculumHeader(standard.learningModule),
    unitNameKey: unitKey(standard.unitName),
    normalizedAchievement: normalizeAchievementText(standard.achievementStandard),
    label: [standard.subjectName, standard.learningModule, standard.unitName, standard.achievementStandard].filter(Boolean).join(" / ")
  }));

  const previewRows: CurriculumUploadPreviewRow[] = [];

  inputRows.forEach((rawRow, index) => {
    const subjectName = normalizeExactValue(rawRow.subjectName);
    const subjectNameKey = normalizeCurriculumSubjectNameForComparison(subjectName);
    const learningModule = normalizeExactValue(rawRow.learningModule);
    const unitName = normalizeExactValue(rawRow.unitName);
    const achievementStandard = normalizeExactValue(rawRow.achievementStandard);
    const keywords = normalizeExactValue(rawRow.keywords);
    const messages: string[] = [];
    const subjectType = normalizeCurriculumSubjectType(rawRow.subjectTypeLabel);
    const subject = subjectByName.get(subjectNameKey);
    const duplicateSubjectName = subject?.subjectName || uploadedSubjectDisplayByKey.get(subjectNameKey) || subjectName;
    const baseRow = {
      ...rawRow,
      subjectName,
      learningModule,
      unitName,
      achievementStandard,
      keywords,
      normalizedSubjectName: subjectNameKey,
      subjectType: subjectType ?? undefined,
      subjectId: subject?.id,
      messages,
      similarMatches: [] as string[],
      duplicateStatus: "none",
      sortOrder: (index + 1) * 10
    };

    if (!subjectName) messages.push("과목명이 없습니다.");
    if (!rawRow.subjectTypeLabel.trim()) messages.push("교과유형이 없습니다.");
    if (rawRow.subjectTypeLabel.trim() && !subjectType) messages.push("교과유형은 일반교과, NCS교과, general, ncs 중 하나여야 합니다.");
    if (!unitName) messages.push("단원명이 없습니다.");
    if (!achievementStandard) messages.push("성취기준이 없습니다.");

    if (messages.length > 0) {
      previewRows.push({ ...baseRow, status: "error" });
      return;
    }

    if (subjectTypeConflictKeys.has(subjectNameKey)) {
      previewRows.push({
        ...baseRow,
        status: "subject_type_conflict",
        messages: ["엑셀 안에서 같은 과목명에 서로 다른 교과유형이 섞여 있습니다."]
      });
      return;
    }

    if (subject && subject.subjectType !== subjectType) {
      previewRows.push({
        ...baseRow,
        status: "subject_type_conflict",
        messages: [`등록된 교과유형은 ${curriculumSubjectTypeLabels[subject.subjectType]}입니다.`]
      });
      return;
    }

    if (subjectType === "ncs" && !learningModule) {
      messages.push("NCS교과는 학습모듈명 입력을 권장합니다.");
    }

    const exactKey = exactDuplicateKey({
      subjectName: duplicateSubjectName,
      learningModule,
      unitName,
      achievementStandard
    });

    if (existingExactKeys.has(exactKey) || seenExactKeys.has(exactKey)) {
      seenExactKeys.add(exactKey);
      previewRows.push({
        ...baseRow,
        status: "exact_duplicate",
        messages: [...messages, "동일한 과목명, 학습모듈명, 단원명, 성취기준이 이미 있습니다."]
      });
      return;
    }

    const currentSubjectNameKey = normalizeCurriculumSubjectNameForComparison(duplicateSubjectName);
    const currentLearningModuleKey = normalizeCurriculumHeader(learningModule);
    const currentUnitNameKey = unitKey(unitName);
    const normalizedAchievement = normalizeAchievementText(achievementStandard);
    const similarMatches = comparableRows
      .filter(
        (candidate) =>
          candidate.subjectNameKey === currentSubjectNameKey &&
          candidate.learningModuleKey === currentLearningModuleKey &&
          candidate.unitNameKey === currentUnitNameKey &&
          isSimilarAchievementText(normalizedAchievement, candidate.normalizedAchievement)
      )
      .slice(0, 3)
      .map((candidate) => candidate.label);

    seenExactKeys.add(exactKey);
    comparableRows.push({
      subjectNameKey: currentSubjectNameKey,
      learningModuleKey: currentLearningModuleKey,
      unitNameKey: currentUnitNameKey,
      normalizedAchievement,
      label: [duplicateSubjectName, learningModule, unitName, achievementStandard].filter(Boolean).join(" / ")
    });

    if (similarMatches.length > 0) {
      previewRows.push({
        ...baseRow,
        status: "similar_duplicate",
        similarMatches,
        messages: [...messages, "정규화된 성취기준이 동일 과목/학습모듈/단원 안의 기존 데이터와 매우 유사합니다."]
      });
      return;
    }

    previewRows.push({
      ...baseRow,
      status: subject ? "existing_subject" : "new_subject",
      messages: [
        ...messages,
        subject ? "등록된 과목을 사용합니다." : "저장 시 curriculum_subjects에 과목을 자동 등록합니다."
      ]
    });
  });

  return {
    rows: previewRows,
    summary: buildCurriculumUploadSummary(previewRows)
  };
}

export async function getCurrentCurriculumProfile() {
  const result = await getCurriculumContext();
  if (!result.context) return { profile: null, error: result.error };
  return { profile: result.context.profile, error: "" };
}

export async function listCurriculumSubjects() {
  const contextResult = await getCurriculumContext();
  if (!contextResult.context) return { subjects: [] as CurriculumSubject[], error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  const { data, error } = await supabase
    .from("curriculum_subjects")
    .select(subjectColumns)
    .eq("school_id", profile.school_id)
    .order("sort_order", { ascending: true })
    .order("subject_name", { ascending: true });

  if (error) return { subjects: [], error: formatCurriculumError("교과목 목록 조회", error) };

  return { subjects: ((data || []) as CurriculumSubjectRow[]).map(normalizeSubject) };
}

export async function createCurriculumSubject(input: {
  subjectName: string;
  subjectType: CurriculumSubjectType;
  description: string;
  sortOrder: number;
}) {
  const contextResult = await getAdminCurriculumContext();
  if (!contextResult.context) return { error: contextResult.error };

  const subjectName = normalizeExactValue(input.subjectName);
  if (!subjectName) return { error: "교과목명을 입력하세요." };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("curriculum_subjects").insert({
    school_id: profile.school_id,
    subject_name: subjectName,
    subject_type: input.subjectType,
    description: input.description.trim(),
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 1000
  });

  return error ? { error: formatCurriculumError("교과목 추가", error) } : {};
}

export async function updateCurriculumSubject(
  id: string,
  input: {
    subjectName: string;
    subjectType: CurriculumSubjectType;
    description: string;
    sortOrder: number;
  }
) {
  const contextResult = await getAdminCurriculumContext();
  if (!contextResult.context) return { error: contextResult.error };

  const subjectName = normalizeExactValue(input.subjectName);
  if (!subjectName) return { error: "교과목명을 입력하세요." };

  const { supabase, profile } = contextResult.context;
  const payload = {
    subject_name: subjectName,
    subject_type: input.subjectType,
    description: input.description.trim(),
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 1000
  };

  const { error } = await supabase.from("curriculum_subjects").update(payload).eq("id", id).eq("school_id", profile.school_id);
  if (error) return { error: formatCurriculumError("교과목 수정", error) };

  const { error: standardError } = await supabase
    .from("curriculum_standards")
    .update({
      subject_name: subjectName,
      subject_type: input.subjectType
    })
    .eq("subject_id", id)
    .eq("school_id", profile.school_id);

  return standardError ? { error: formatCurriculumError("연결된 성취기준 교과목명 동기화", standardError) } : {};
}

export async function deleteCurriculumSubject(id: string) {
  const contextResult = await getAdminCurriculumContext();
  if (!contextResult.context) return { error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("curriculum_subjects").delete().eq("id", id).eq("school_id", profile.school_id);

  return error ? { error: formatCurriculumError("교과목 삭제", error) } : {};
}

export async function listCurriculumStandards(options?: {
  subjectName?: string;
  learningModule?: string;
  status?: CurriculumStandardStatus;
  limit?: number;
}) {
  const contextResult = await getCurriculumContext();
  if (!contextResult.context) return { standards: [] as CurriculumStandard[], error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  let query = supabase
    .from("curriculum_standards")
    .select(standardColumns)
    .eq("school_id", profile.school_id)
    .order("subject_name", { ascending: true })
    .order("learning_module", { ascending: true, nullsFirst: true })
    .order("unit_name", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (options?.subjectName?.trim()) {
    query = query.eq("subject_name", normalizeExactValue(options.subjectName));
  }

  if (options?.learningModule?.trim()) {
    query = query.eq("learning_module", normalizeExactValue(options.learningModule));
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) return { standards: [], error: formatCurriculumError("성취기준 목록 조회", error) };

  return { standards: ((data || []) as CurriculumStandardRow[]).map(normalizeStandard) };
}

export async function createCurriculumStandards(inputs: CreateCurriculumStandardInput[]) {
  const contextResult = await getCurriculumContext();
  if (!contextResult.context) return { standards: [] as CurriculumStandard[], error: contextResult.error };
  if (inputs.length === 0) return { standards: [] as CurriculumStandard[] };

  const { supabase, profile } = contextResult.context;
  const payload = inputs.map((input) => ({
    school_id: profile.school_id,
    subject_id: input.subjectId,
    subject_name: normalizeExactValue(input.subjectName),
    subject_type: input.subjectType,
    learning_module: normalizeExactValue(input.learningModule) || null,
    unit_name: normalizeExactValue(input.unitName),
    achievement_standard: normalizeExactValue(input.achievementStandard),
    keywords: normalizeExactValue(input.keywords),
    uploaded_by: profile.id,
    status: "active",
    duplicate_status: input.duplicateStatus || "none",
    sort_order: input.sortOrder
  }));

  const { data, error } = await supabase.from("curriculum_standards").insert(payload).select(standardColumns);
  if (error) return { standards: [], error: formatCurriculumError("성취기준 저장", error) };

  return { standards: ((data || []) as CurriculumStandardRow[]).map(normalizeStandard) };
}

export async function saveCurriculumUpload(inputs: CreateCurriculumStandardInput[]): Promise<SaveCurriculumUploadResult> {
  if (inputs.length === 0) {
    return {
      savedRows: 0,
      createdSubjectCount: 0,
      reusedSubjectCount: 0,
      skippedDuplicateRows: 0,
      error: "저장할 신규 성취기준이 없습니다."
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const supabase = createSupabaseBrowserClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch("/api/curriculum/upload", {
    method: "POST",
    headers,
    body: JSON.stringify({ rows: inputs })
  });
  const result = (await response.json().catch(() => null)) as Partial<SaveCurriculumUploadResult> | null;

  if (!response.ok) {
    return {
      savedRows: 0,
      createdSubjectCount: 0,
      reusedSubjectCount: 0,
      skippedDuplicateRows: 0,
      error: result?.error || "성취기준 업로드 저장에 실패했습니다."
    };
  }

  return {
    savedRows: result?.savedRows ?? 0,
    createdSubjectCount: result?.createdSubjectCount ?? 0,
    reusedSubjectCount: result?.reusedSubjectCount ?? 0,
    skippedDuplicateRows: result?.skippedDuplicateRows ?? 0
  };
}

export async function getCurriculumStandardsBySubject(subjectName: string) {
  const normalizedSubjectName = normalizeExactValue(subjectName);
  if (!normalizedSubjectName) return { standards: [] as CurriculumStandard[] };

  const contextResult = await getCurriculumContext();
  if (!contextResult.context) return { standards: [] as CurriculumStandard[], error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  const { data, error } = await supabase
    .from("curriculum_standards")
    .select(standardColumns)
    .eq("school_id", profile.school_id)
    .eq("subject_name", normalizedSubjectName)
    .eq("status", "active")
    .order("learning_module", { ascending: true, nullsFirst: true })
    .order("unit_name", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return { standards: [], error: formatCurriculumError("과목별 성취기준 검색", error) };

  return { standards: ((data || []) as CurriculumStandardRow[]).map(normalizeStandard) };
}
