import { createSupabaseServiceClient, getSchoolId } from "@/lib/supabase-server";
import type { CurriculumStandard, CurriculumStandardStatus, CurriculumSubjectType } from "@/lib/curriculum";

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
  limit?: number;
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
    .order("sort_order", { ascending: true })
    .limit(options?.limit ?? 5);

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
