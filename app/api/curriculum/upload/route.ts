import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import {
  curriculumSubjectTypeLabels,
  normalizeCurriculumSubjectNameForComparison,
  type CreateCurriculumStandardInput,
  type CurriculumSubjectType
} from "@/lib/curriculum";

type UserProfileRow = {
  id: string;
  school_id: string;
  role: string;
};

type CurriculumSubjectRow = {
  id: string;
  school_id: string;
  subject_name: string;
  subject_type: CurriculumSubjectType;
  description: string | null;
  sort_order: number | null;
};

type StandardPayload = {
  school_id: string;
  subject_id: string;
  subject_name: string;
  subject_type: CurriculumSubjectType;
  learning_module: string | null;
  unit_name: string;
  achievement_standard: string;
  keywords: string;
  uploaded_by: string;
  status: "active";
  duplicate_status: string;
  sort_order: number;
};

const subjectColumns = "id, school_id, subject_name, subject_type, description, sort_order";
const standardColumns =
  "id, school_id, subject_id, subject_name, subject_type, learning_module, unit_name, achievement_standard, keywords, uploaded_by, status, duplicate_status, sort_order";

function errorResponse(error: string, status: number) {
  return NextResponse.json(
    {
      savedRows: 0,
      createdSubjectCount: 0,
      reusedSubjectCount: 0,
      skippedDuplicateRows: 0,
      error
    },
    { status }
  );
}

function normalizeExactValue(value?: string | null) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function normalizeLearningModule(value?: string | null) {
  return normalizeExactValue(value) || null;
}

function standardConflictKey(payload: StandardPayload) {
  return [
    payload.school_id,
    payload.subject_name,
    payload.learning_module || "",
    payload.unit_name,
    payload.achievement_standard
  ].join("\u001f");
}

function parseRows(body: unknown): CreateCurriculumStandardInput[] {
  if (!body || typeof body !== "object" || !("rows" in body)) return [];
  const rows = (body as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as CreateCurriculumStandardInput[]) : [];
}

function validateRows(rows: CreateCurriculumStandardInput[]) {
  const messages: string[] = [];
  const subjectTypesByKey = new Map<string, Set<CurriculumSubjectType>>();

  rows.forEach((row, index) => {
    const label = `${index + 1}번째 저장 행`;
    const subjectName = normalizeExactValue(row.subjectName);
    const subjectKey = normalizeCurriculumSubjectNameForComparison(subjectName);
    const unitName = normalizeExactValue(row.unitName);
    const achievementStandard = normalizeExactValue(row.achievementStandard);

    if (!subjectName) messages.push(`${label}: 과목명이 없습니다.`);
    if (!row.subjectType || !["general", "ncs"].includes(row.subjectType)) messages.push(`${label}: 교과유형이 올바르지 않습니다.`);
    if (!unitName) messages.push(`${label}: 단원명이 없습니다.`);
    if (!achievementStandard) messages.push(`${label}: 성취기준이 없습니다.`);

    if (subjectKey && row.subjectType && ["general", "ncs"].includes(row.subjectType)) {
      const subjectTypes = subjectTypesByKey.get(subjectKey) || new Set<CurriculumSubjectType>();
      subjectTypes.add(row.subjectType);
      subjectTypesByKey.set(subjectKey, subjectTypes);
    }
  });

  subjectTypesByKey.forEach((subjectTypes, subjectKey) => {
    if (subjectTypes.size > 1) {
      messages.push(`과목 교과유형 충돌: ${subjectKey} 과목에 일반교과와 NCS교과가 함께 포함되어 있습니다.`);
    }
  });

  return messages;
}

function mapSubjectsByNormalizedName(subjects: CurriculumSubjectRow[]) {
  const subjectByKey = new Map<string, CurriculumSubjectRow>();
  subjects.forEach((subject) => {
    const subjectKey = normalizeCurriculumSubjectNameForComparison(subject.subject_name);
    if (subjectKey && !subjectByKey.has(subjectKey)) subjectByKey.set(subjectKey, subject);
  });
  return subjectByKey;
}

async function getAuthenticatedProfile(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return {
      error: errorResponse("로그인이 필요한 성취기준 업로드 요청입니다.", 401)
    };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      error: errorResponse("Supabase service role 키가 없어 과목 자동 등록을 수행할 수 없습니다.", 500)
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  const authUser = authData.user;
  if (authError || !authUser) {
    return {
      error: errorResponse("로그인 세션을 확인하지 못했습니다.", 401)
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, school_id, role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) {
    return {
      error: errorResponse(`사용자 프로필 조회 실패: ${profileError.message}`, 500)
    };
  }

  if (!profile) {
    return {
      error: errorResponse("사용자 프로필을 찾지 못했습니다.", 403)
    };
  }

  const profileRow = profile as UserProfileRow;
  if (!["admin", "teacher"].includes(profileRow.role)) {
    return {
      error: errorResponse("성취기준 업로드는 teacher 또는 admin만 사용할 수 있습니다.", 403)
    };
  }

  return {
    supabase,
    profile: profileRow
  };
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedProfile(request);
  if ("error" in authResult) return authResult.error;

  const body = (await request.json().catch(() => null)) as unknown;
  const rows = parseRows(body);
  if (rows.length === 0) {
    return errorResponse("저장할 성취기준 행이 없습니다.", 400);
  }

  const rowErrors = validateRows(rows);
  if (rowErrors.length > 0) {
    return errorResponse(rowErrors.join(" "), 400);
  }

  const { supabase, profile } = authResult;
  const { data: existingSubjects, error: subjectListError } = await supabase
    .from("curriculum_subjects")
    .select(subjectColumns)
    .eq("school_id", profile.school_id);

  if (subjectListError) {
    return errorResponse(`과목 목록 조회 실패: ${subjectListError.message}`, 500);
  }

  let subjectByKey = mapSubjectsByNormalizedName((existingSubjects || []) as CurriculumSubjectRow[]);
  const uniqueSubjectInputs = new Map<string, CreateCurriculumStandardInput>();

  rows.forEach((row) => {
    const subjectName = normalizeExactValue(row.subjectName);
    const subjectKey = normalizeCurriculumSubjectNameForComparison(subjectName);
    if (subjectKey && !uniqueSubjectInputs.has(subjectKey)) uniqueSubjectInputs.set(subjectKey, row);
  });

  for (const [subjectKey, row] of uniqueSubjectInputs.entries()) {
    const existingSubject = subjectByKey.get(subjectKey);
    if (existingSubject && existingSubject.subject_type !== row.subjectType) {
      return errorResponse(
        `과목 교과유형 충돌: ${normalizeExactValue(row.subjectName)}은(는) 이미 ${curriculumSubjectTypeLabels[existingSubject.subject_type]}로 등록되어 있습니다.`,
        400
      );
    }
  }

  const currentSubjects = (existingSubjects || []) as CurriculumSubjectRow[];
  const maxSortOrder = currentSubjects.reduce((max, subject) => Math.max(max, subject.sort_order ?? 0), 0);
  let nextSortOrder = currentSubjects.length > 0 ? maxSortOrder + 1 : 0;
  const subjectsToCreate = Array.from(uniqueSubjectInputs.entries())
    .filter(([subjectKey]) => !subjectByKey.has(subjectKey))
    .map(([, row]) => {
      const payload = {
        school_id: profile.school_id,
        subject_name: normalizeExactValue(row.subjectName),
        subject_type: row.subjectType,
        description: "성취기준 업로드로 자동 등록",
        sort_order: nextSortOrder
      };
      nextSortOrder += 1;
      return payload;
    });

  let createdSubjectCount = 0;
  if (subjectsToCreate.length > 0) {
    const { data: createdSubjects, error: createSubjectError } = await supabase
      .from("curriculum_subjects")
      .upsert(subjectsToCreate, {
        onConflict: "school_id,subject_name",
        ignoreDuplicates: true
      })
      .select(subjectColumns);

    if (createSubjectError) {
      return errorResponse(`과목 자동 등록 실패: ${createSubjectError.message}`, 500);
    }

    createdSubjectCount = createdSubjects?.length ?? 0;

    const { data: refreshedSubjects, error: refreshSubjectError } = await supabase
      .from("curriculum_subjects")
      .select(subjectColumns)
      .eq("school_id", profile.school_id);

    if (refreshSubjectError) {
      return errorResponse(`자동 등록 과목 재조회 실패: ${refreshSubjectError.message}`, 500);
    }

    subjectByKey = mapSubjectsByNormalizedName((refreshedSubjects || []) as CurriculumSubjectRow[]);
  }

  const standardPayloadByKey = new Map<string, StandardPayload>();
  for (const row of rows) {
    const subjectName = normalizeExactValue(row.subjectName);
    const subjectKey = normalizeCurriculumSubjectNameForComparison(subjectName);
    const subject = subjectByKey.get(subjectKey);
    if (!subject) {
      return errorResponse(`과목 자동 등록 후에도 ${subjectName} 과목을 찾지 못했습니다.`, 500);
    }
    if (subject.subject_type !== row.subjectType) {
      return errorResponse(
        `과목 교과유형 충돌: ${subjectName}은(는) ${curriculumSubjectTypeLabels[subject.subject_type]}로 등록되어 있습니다.`,
        400
      );
    }

    const payload: StandardPayload = {
      school_id: profile.school_id,
      subject_id: subject.id,
      subject_name: subject.subject_name,
      subject_type: subject.subject_type,
      learning_module: normalizeLearningModule(row.learningModule),
      unit_name: normalizeExactValue(row.unitName),
      achievement_standard: normalizeExactValue(row.achievementStandard),
      keywords: normalizeExactValue(row.keywords),
      uploaded_by: profile.id,
      status: "active",
      duplicate_status: row.duplicateStatus || "none",
      sort_order: Number.isFinite(row.sortOrder) ? row.sortOrder : 0
    };

    const conflictKey = standardConflictKey(payload);
    if (!standardPayloadByKey.has(conflictKey)) standardPayloadByKey.set(conflictKey, payload);
  }

  const standardPayload = Array.from(standardPayloadByKey.values());
  const duplicatedRowsInRequest = rows.length - standardPayload.length;
  const { data: standards, error: standardError } = await supabase
    .from("curriculum_standards")
    .upsert(standardPayload, {
      onConflict: "school_id,subject_name,learning_module,unit_name,achievement_standard",
      ignoreDuplicates: true
    })
    .select(standardColumns);

  if (standardError) {
    return errorResponse(`성취기준 저장 실패: ${standardError.message}`, 500);
  }

  const savedRows = standards?.length ?? 0;
  return NextResponse.json({
    savedRows,
    createdSubjectCount,
    reusedSubjectCount: Math.max(0, uniqueSubjectInputs.size - createdSubjectCount),
    skippedDuplicateRows: duplicatedRowsInRequest + Math.max(0, standardPayload.length - savedRows)
  });
}
