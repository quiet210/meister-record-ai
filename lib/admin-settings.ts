import {
  activityTypeOptions,
  competencyOptions,
  departmentOptions as fallbackDepartmentOptions,
  improvementOptions,
  industrialAttitudeOptions,
  schoolLifeAreaOptions,
  subjectOptions as fallbackSubjectOptions
} from "@/lib/options";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ensureUserProfile, type UserProfile } from "@/lib/students";

export type DepartmentOption = {
  id?: string;
  value: string;
  label: string;
  sortOrder?: number;
};

export type SubjectOption = {
  id?: string;
  name: string;
  sortOrder?: number;
};

export type SettingsSubjectOption = {
  id?: string;
  subjectName: string;
  subjectType: "general" | "ncs";
  sortOrder?: number;
};

export type ChecklistCategoryKey =
  | "subject_activity_type"
  | "subject_competency"
  | "subject_improvement"
  | "behavior_life_attitude"
  | "behavior_collaboration"
  | "behavior_leadership"
  | "behavior_responsibility"
  | "behavior_safety"
  | "behavior_work_ethic";

export type ChecklistMode = "subject" | "behavior";

export type ChecklistGroup = {
  id?: string;
  key: ChecklistCategoryKey;
  mode: ChecklistMode;
  label: string;
  options: string[];
  sortOrder: number;
};

export type ChecklistItem = {
  id: string;
  categoryId: string;
  categoryKey: ChecklistCategoryKey;
  label: string;
  sortOrder: number;
};

export type SettingsOptions = {
  departmentOptions: DepartmentOption[];
  subjectOptions: string[];
  curriculumSubjects: SettingsSubjectOption[];
  subjectChecklistGroups: ChecklistGroup[];
  subjectImprovementOptions: string[];
  behaviorSchoolLifeChecklistGroups: ChecklistGroup[];
  behaviorIndustrialChecklistGroups: ChecklistGroup[];
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type DepartmentRow = {
  id: string;
  school_id: string;
  code: string;
  label: string;
  sort_order: number;
};

type CurriculumSubjectSettingsRow = {
  id: string;
  school_id: string;
  subject_name: string;
  subject_type: "general" | "ncs";
  sort_order: number;
};

type ChecklistCategoryRow = {
  id: string;
  school_id: string;
  mode: ChecklistMode;
  key: ChecklistCategoryKey;
  label: string;
  sort_order: number;
};

type ChecklistItemRow = {
  id: string;
  school_id: string;
  category_id: string;
  label: string;
  sort_order: number;
};

type AdminContext = {
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;
  profile: UserProfile;
};

const behaviorLifeAttitudeOptions = schoolLifeAreaOptions.filter(
  (option) => !["협동심", "리더십", "책임감", "학급 역할 수행"].includes(option)
);

const checklistCategoryDefinitions = [
  {
    key: "subject_activity_type",
    mode: "subject",
    label: "활동유형",
    sortOrder: 10,
    fallbackItems: [...activityTypeOptions]
  },
  {
    key: "subject_competency",
    mode: "subject",
    label: "역량 키워드",
    sortOrder: 20,
    fallbackItems: [...competencyOptions]
  },
  {
    key: "subject_improvement",
    mode: "subject",
    label: "보완점",
    sortOrder: 30,
    fallbackItems: [...improvementOptions]
  },
  {
    key: "behavior_life_attitude",
    mode: "behavior",
    label: "생활태도",
    sortOrder: 110,
    fallbackItems: behaviorLifeAttitudeOptions
  },
  {
    key: "behavior_collaboration",
    mode: "behavior",
    label: "협업",
    sortOrder: 120,
    fallbackItems: ["협동심", "협업 태도"]
  },
  {
    key: "behavior_leadership",
    mode: "behavior",
    label: "리더십",
    sortOrder: 130,
    fallbackItems: ["리더십", "학급 역할 수행"]
  },
  {
    key: "behavior_responsibility",
    mode: "behavior",
    label: "책임감",
    sortOrder: 140,
    fallbackItems: ["책임감", "작업 책임감"]
  },
  {
    key: "behavior_safety",
    mode: "behavior",
    label: "안전의식",
    sortOrder: 150,
    fallbackItems: industrialAttitudeOptions.filter((option) => ["안전수칙 준수", "실습실 정리정돈", "장비 관리 태도"].includes(option))
  },
  {
    key: "behavior_work_ethic",
    mode: "behavior",
    label: "직업윤리",
    sortOrder: 160,
    fallbackItems: industrialAttitudeOptions.filter((option) => ["직업윤리", "현장실습 태도", "취업 준비 태도"].includes(option))
  }
] as const;

export const subjectChecklistCategoryKeys: ChecklistCategoryKey[] = ["subject_activity_type", "subject_competency"];
export const behaviorSchoolLifeChecklistCategoryKeys: ChecklistCategoryKey[] = [
  "behavior_life_attitude",
  "behavior_collaboration",
  "behavior_leadership",
  "behavior_responsibility"
];
export const behaviorIndustrialChecklistCategoryKeys: ChecklistCategoryKey[] = ["behavior_safety", "behavior_work_ethic"];

const departmentColumns = "id, school_id, code, label, sort_order";
const curriculumSubjectColumns = "id, school_id, subject_name, subject_type, sort_order";
const categoryColumns = "id, school_id, mode, key, label, sort_order";
const itemColumns = "id, school_id, category_id, label, sort_order";

function isChecklistCategoryKey(value: string): value is ChecklistCategoryKey {
  return checklistCategoryDefinitions.some((definition) => definition.key === value);
}

function formatSettingsError(action: string, error: SupabaseErrorLike) {
  const message = error.message || "알 수 없는 Supabase 오류가 발생했습니다.";
  const context = [error.details, error.hint, error.code ? `code: ${error.code}` : ""].filter(Boolean).join(" / ");
  return `${action} 실패: ${message}${context ? ` (${context})` : ""}`;
}

function normalizeCode(code: string) {
  return code.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
}

function getDefinition(key: ChecklistCategoryKey) {
  return checklistCategoryDefinitions.find((definition) => definition.key === key);
}

function fallbackGroup(key: ChecklistCategoryKey): ChecklistGroup {
  const definition = getDefinition(key);
  if (!definition) {
    return {
      key,
      mode: "subject",
      label: key,
      options: [],
      sortOrder: 0
    };
  }

  return {
    key: definition.key,
    mode: definition.mode,
    label: definition.label,
    options: [...definition.fallbackItems],
    sortOrder: definition.sortOrder
  };
}

function buildGroups(keys: ChecklistCategoryKey[], categories: ChecklistCategoryRow[], itemsByKey: Map<ChecklistCategoryKey, string[]>) {
  return keys.map((key) => {
    const fallback = fallbackGroup(key);
    const category = categories.find((item) => item.key === key);
    const dbItems = itemsByKey.get(key) || [];

    return {
      ...fallback,
      id: category?.id,
      label: category?.label || fallback.label,
      options: dbItems.length > 0 ? dbItems : fallback.options,
      sortOrder: category?.sort_order ?? fallback.sortOrder
    };
  });
}

export function getFallbackSettingsOptions(): SettingsOptions {
  const subjectGroups = buildGroups(subjectChecklistCategoryKeys, [], new Map());
  const subjectImprovementGroup = buildGroups(["subject_improvement"], [], new Map())[0];
  const behaviorSchoolLifeGroups = buildGroups(behaviorSchoolLifeChecklistCategoryKeys, [], new Map());
  const behaviorIndustrialGroups = buildGroups(behaviorIndustrialChecklistCategoryKeys, [], new Map());

  return {
    departmentOptions: fallbackDepartmentOptions.map((option, index) => ({
      value: option.value,
      label: option.label,
      sortOrder: (index + 1) * 10
    })),
    subjectOptions: [...fallbackSubjectOptions],
    curriculumSubjects: fallbackSubjectOptions.map((subjectName, index) => ({
      subjectName,
      subjectType: "general",
      sortOrder: (index + 1) * 10
    })),
    subjectChecklistGroups: subjectGroups,
    subjectImprovementOptions: subjectImprovementGroup?.options || [...improvementOptions],
    behaviorSchoolLifeChecklistGroups: behaviorSchoolLifeGroups,
    behaviorIndustrialChecklistGroups: behaviorIndustrialGroups
  };
}

async function getProfileContext(): Promise<{ context?: AdminContext; error?: string }> {
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

async function getAdminContext(): Promise<{ context?: AdminContext; error?: string }> {
  const result = await getProfileContext();
  if (!result.context) return result;

  if (result.context.profile.role !== "admin") {
    return { error: "관리자 권한이 필요합니다." };
  }

  return result;
}

export async function loadSettingsOptions(): Promise<SettingsOptions> {
  const fallback = getFallbackSettingsOptions();
  const contextResult = await getProfileContext();
  if (!contextResult.context) {
    return fallback;
  }

  const { supabase, profile } = contextResult.context;

  const [departmentResult, subjectResult, categoryResult, itemResult] = await Promise.all([
    supabase.from("departments").select(departmentColumns).eq("school_id", profile.school_id).order("sort_order", { ascending: true }).order("label", { ascending: true }),
    supabase
      .from("curriculum_subjects")
      .select(curriculumSubjectColumns)
      .eq("school_id", profile.school_id)
      .order("sort_order", { ascending: true })
      .order("subject_name", { ascending: true }),
    supabase.from("checklist_categories").select(categoryColumns).eq("school_id", profile.school_id).order("sort_order", { ascending: true }),
    supabase.from("checklist_items").select(itemColumns).eq("school_id", profile.school_id).order("sort_order", { ascending: true }).order("label", { ascending: true })
  ]);

  const departmentRows = departmentResult.error ? [] : ((departmentResult.data || []) as DepartmentRow[]);
  const subjectRows = subjectResult.error ? [] : ((subjectResult.data || []) as CurriculumSubjectSettingsRow[]);
  const categoryRows = categoryResult.error
    ? []
    : ((categoryResult.data || []) as Array<Omit<ChecklistCategoryRow, "key"> & { key: string }>).filter((row): row is ChecklistCategoryRow =>
        isChecklistCategoryKey(row.key)
      );
  const itemRows = itemResult.error ? [] : ((itemResult.data || []) as ChecklistItemRow[]);

  if (departmentResult.error) console.warn("[admin-settings] departments fallback", departmentResult.error);
  if (subjectResult.error) console.warn("[admin-settings] curriculum_subjects fallback", subjectResult.error);
  if (categoryResult.error) console.warn("[admin-settings] checklist categories fallback", categoryResult.error);
  if (itemResult.error) console.warn("[admin-settings] checklist items fallback", itemResult.error);

  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const itemsByKey = new Map<ChecklistCategoryKey, string[]>();
  itemRows.forEach((item) => {
    const category = categoryById.get(item.category_id);
    if (!category) return;
    const current = itemsByKey.get(category.key) || [];
    current.push(item.label);
    itemsByKey.set(category.key, current);
  });

  const subjectImprovementGroup = buildGroups(["subject_improvement"], categoryRows, itemsByKey)[0];

  const curriculumSubjects =
    subjectRows.length > 0
      ? subjectRows.map((row) => ({
          id: row.id,
          subjectName: row.subject_name,
          subjectType: row.subject_type,
          sortOrder: row.sort_order
        }))
      : fallback.curriculumSubjects;

  return {
    departmentOptions:
      departmentRows.length > 0
        ? departmentRows.map((row) => ({
            id: row.id,
            value: row.code,
            label: row.label,
            sortOrder: row.sort_order
          }))
        : fallback.departmentOptions,
    subjectOptions: curriculumSubjects.map((subject) => subject.subjectName),
    curriculumSubjects,
    subjectChecklistGroups: buildGroups(subjectChecklistCategoryKeys, categoryRows, itemsByKey),
    subjectImprovementOptions: subjectImprovementGroup?.options || fallback.subjectImprovementOptions,
    behaviorSchoolLifeChecklistGroups: buildGroups(behaviorSchoolLifeChecklistCategoryKeys, categoryRows, itemsByKey),
    behaviorIndustrialChecklistGroups: buildGroups(behaviorIndustrialChecklistCategoryKeys, categoryRows, itemsByKey)
  };
}

export async function checkAdminAccess() {
  return getAdminContext();
}

function isMissingCurriculumSubjectsError(error: SupabaseErrorLike) {
  const text = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`;
  return error.code === "42P01" || error.code === "PGRST205" || /schema cache|does not exist|could not find|relation .*curriculum_subjects/i.test(text);
}

export async function seedDefaultAdminSettings() {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  const fallback = getFallbackSettingsOptions();

  const { data: existingDepartments, error: departmentSelectError } = await supabase
    .from("departments")
    .select("id")
    .eq("school_id", profile.school_id)
    .limit(1);

  if (departmentSelectError) return { error: formatSettingsError("학과 기본값 확인", departmentSelectError) };

  if (!existingDepartments || existingDepartments.length === 0) {
    const { error } = await supabase.from("departments").insert(
      fallback.departmentOptions.map((option, index) => ({
        school_id: profile.school_id,
        code: option.value,
        label: option.label,
        sort_order: option.sortOrder ?? (index + 1) * 10
      }))
    );
    if (error) return { error: formatSettingsError("학과 기본값 생성", error) };
  }

  const { data: existingSubjects, error: subjectSelectError } = await supabase
    .from("curriculum_subjects")
    .select("id")
    .eq("school_id", profile.school_id)
    .limit(1);
  if (subjectSelectError && !isMissingCurriculumSubjectsError(subjectSelectError)) {
    return { error: formatSettingsError("과목 기본값 확인", subjectSelectError) };
  }

  if (!subjectSelectError && (!existingSubjects || existingSubjects.length === 0)) {
    const { error } = await supabase.from("curriculum_subjects").insert(
      fallback.subjectOptions.map((subjectName, index) => ({
        school_id: profile.school_id,
        subject_name: subjectName,
        subject_type: "general",
        description: "",
        sort_order: (index + 1) * 10
      }))
    );
    if (error) return { error: formatSettingsError("과목 기본값 생성", error) };
  }

  const { data: categories, error: categoryError } = await supabase
    .from("checklist_categories")
    .upsert(
      checklistCategoryDefinitions.map((definition) => ({
        school_id: profile.school_id,
        mode: definition.mode,
        key: definition.key,
        label: definition.label,
        sort_order: definition.sortOrder
      })),
      { onConflict: "school_id,key" }
    )
    .select(categoryColumns);

  if (categoryError) return { error: formatSettingsError("체크리스트 분류 기본값 생성", categoryError) };

  const { data: existingItems, error: itemSelectError } = await supabase.from("checklist_items").select("id").eq("school_id", profile.school_id).limit(1);
  if (itemSelectError) return { error: formatSettingsError("체크리스트 기본값 확인", itemSelectError) };

  if (!existingItems || existingItems.length === 0) {
    const categoryRows = ((categories || []) as Array<Omit<ChecklistCategoryRow, "key"> & { key: string }>).filter((row): row is ChecklistCategoryRow =>
      isChecklistCategoryKey(row.key)
    );
    const categoryByKey = new Map(categoryRows.map((category) => [category.key, category]));
    const itemPayload = checklistCategoryDefinitions.flatMap((definition) => {
      const category = categoryByKey.get(definition.key);
      if (!category) return [];
      return definition.fallbackItems.map((label, index) => ({
        school_id: profile.school_id,
        category_id: category.id,
        label,
        sort_order: (index + 1) * 10
      }));
    });

    if (itemPayload.length > 0) {
      const { error } = await supabase.from("checklist_items").insert(itemPayload);
      if (error) return { error: formatSettingsError("체크리스트 기본값 생성", error) };
    }
  }

  return {};
}

export async function listAdminDepartments() {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { departments: [] as DepartmentOption[], error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  const { data, error } = await supabase
    .from("departments")
    .select(departmentColumns)
    .eq("school_id", profile.school_id)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) return { departments: [], error: formatSettingsError("학과 목록 조회", error) };

  return {
    departments: ((data || []) as DepartmentRow[]).map((row) => ({
      id: row.id,
      value: row.code,
      label: row.label,
      sortOrder: row.sort_order
    }))
  };
}

export async function createDepartment(input: { code: string; label: string }) {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const code = normalizeCode(input.code);
  const label = input.label.trim();
  if (!code) return { error: "학과 코드는 영문, 숫자, 하이픈, 밑줄 중 하나 이상을 입력하세요." };
  if (!label) return { error: "학과명을 입력하세요." };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("departments").insert({
    school_id: profile.school_id,
    code,
    label,
    sort_order: 1000
  });

  return error ? { error: formatSettingsError("학과 추가", error) } : {};
}

export async function updateDepartment(id: string, input: { label: string }) {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const label = input.label.trim();
  if (!label) return { error: "학과명을 입력하세요." };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("departments").update({ label }).eq("id", id).eq("school_id", profile.school_id);

  return error ? { error: formatSettingsError("학과 수정", error) } : {};
}

export async function deleteDepartment(id: string) {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("departments").delete().eq("id", id).eq("school_id", profile.school_id);

  return error ? { error: formatSettingsError("학과 삭제", error) } : {};
}

export async function listAdminSubjects() {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { subjects: [] as SubjectOption[], error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  const { data, error } = await supabase
    .from("curriculum_subjects")
    .select(curriculumSubjectColumns)
    .eq("school_id", profile.school_id)
    .order("sort_order", { ascending: true })
    .order("subject_name", { ascending: true });

  if (error) return { subjects: [], error: formatSettingsError("과목 목록 조회", error) };

  return {
    subjects: ((data || []) as CurriculumSubjectSettingsRow[]).map((row) => ({
      id: row.id,
      name: row.subject_name,
      sortOrder: row.sort_order
    }))
  };
}

/**
 * @deprecated 과목 마스터는 public.curriculum_subjects를 사용합니다. 이 함수는 구 화면 호환용입니다.
 */
export async function createSubject(input: { name: string }) {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const name = input.name.trim();
  if (!name) return { error: "과목명을 입력하세요." };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("curriculum_subjects").insert({
    school_id: profile.school_id,
    subject_name: name,
    subject_type: "general",
    description: "",
    sort_order: 1000
  });

  return error ? { error: formatSettingsError("과목 추가", error) } : {};
}

/**
 * @deprecated 과목 마스터는 public.curriculum_subjects를 사용합니다. 이 함수는 구 화면 호환용입니다.
 */
export async function updateSubject(id: string, input: { name: string }) {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const name = input.name.trim();
  if (!name) return { error: "과목명을 입력하세요." };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("curriculum_subjects").update({ subject_name: name }).eq("id", id).eq("school_id", profile.school_id);
  if (error) return { error: formatSettingsError("과목 수정", error) };

  const { error: standardError } = await supabase.from("curriculum_standards").update({ subject_name: name }).eq("subject_id", id).eq("school_id", profile.school_id);
  return standardError ? { error: formatSettingsError("연결된 성취기준 과목명 동기화", standardError) } : {};
}

/**
 * @deprecated 과목 마스터는 public.curriculum_subjects를 사용합니다. 이 함수는 구 화면 호환용입니다.
 */
export async function deleteSubject(id: string) {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("curriculum_subjects").delete().eq("id", id).eq("school_id", profile.school_id);

  return error ? { error: formatSettingsError("과목 삭제", error) } : {};
}

async function ensureChecklistCategories(context: AdminContext) {
  const { supabase, profile } = context;
  const { error } = await supabase.from("checklist_categories").upsert(
    checklistCategoryDefinitions.map((definition) => ({
      school_id: profile.school_id,
      mode: definition.mode,
      key: definition.key,
      label: definition.label,
      sort_order: definition.sortOrder
    })),
    { onConflict: "school_id,key" }
  );

  return error ? formatSettingsError("체크리스트 분류 준비", error) : "";
}

export async function listAdminChecklistGroups() {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { groups: [] as ChecklistGroup[], items: [] as ChecklistItem[], error: contextResult.error };

  const categoryPrepareError = await ensureChecklistCategories(contextResult.context);
  if (categoryPrepareError) return { groups: [], items: [], error: categoryPrepareError };

  const { supabase, profile } = contextResult.context;
  const [categoryResult, itemResult] = await Promise.all([
    supabase.from("checklist_categories").select(categoryColumns).eq("school_id", profile.school_id).order("sort_order", { ascending: true }),
    supabase.from("checklist_items").select(itemColumns).eq("school_id", profile.school_id).order("sort_order", { ascending: true }).order("label", { ascending: true })
  ]);

  if (categoryResult.error) return { groups: [], items: [], error: formatSettingsError("체크리스트 분류 조회", categoryResult.error) };
  if (itemResult.error) return { groups: [], items: [], error: formatSettingsError("체크리스트 항목 조회", itemResult.error) };

  const categoryRows = ((categoryResult.data || []) as Array<Omit<ChecklistCategoryRow, "key"> & { key: string }>).filter((row): row is ChecklistCategoryRow =>
    isChecklistCategoryKey(row.key)
  );
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const itemsByKey = new Map<ChecklistCategoryKey, string[]>();
  const items = ((itemResult.data || []) as ChecklistItemRow[]).flatMap((row) => {
    const category = categoryById.get(row.category_id);
    if (!category) return [];
    const current = itemsByKey.get(category.key) || [];
    current.push(row.label);
    itemsByKey.set(category.key, current);
    return [
      {
        id: row.id,
        categoryId: row.category_id,
        categoryKey: category.key,
        label: row.label,
        sortOrder: row.sort_order
      }
    ];
  });

  return {
    groups: [
      ...buildGroups(subjectChecklistCategoryKeys, categoryRows, itemsByKey),
      ...buildGroups(behaviorSchoolLifeChecklistCategoryKeys, categoryRows, itemsByKey),
      ...buildGroups(behaviorIndustrialChecklistCategoryKeys, categoryRows, itemsByKey)
    ],
    items
  };
}

export async function createChecklistItem(input: { categoryKey: ChecklistCategoryKey; label: string }) {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const label = input.label.trim();
  if (!label) return { error: "체크리스트 항목을 입력하세요." };

  const categoryPrepareError = await ensureChecklistCategories(contextResult.context);
  if (categoryPrepareError) return { error: categoryPrepareError };

  const { supabase, profile } = contextResult.context;
  const { data: category, error: categoryError } = await supabase
    .from("checklist_categories")
    .select(categoryColumns)
    .eq("school_id", profile.school_id)
    .eq("key", input.categoryKey)
    .maybeSingle();

  if (categoryError) return { error: formatSettingsError("체크리스트 분류 조회", categoryError) };
  if (!category) return { error: "체크리스트 분류를 찾지 못했습니다." };

  const { error } = await supabase.from("checklist_items").insert({
    school_id: profile.school_id,
    category_id: (category as ChecklistCategoryRow).id,
    label,
    sort_order: 1000
  });

  return error ? { error: formatSettingsError("체크리스트 항목 추가", error) } : {};
}

export async function updateChecklistItem(id: string, input: { label: string }) {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const label = input.label.trim();
  if (!label) return { error: "체크리스트 항목을 입력하세요." };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("checklist_items").update({ label }).eq("id", id).eq("school_id", profile.school_id);

  return error ? { error: formatSettingsError("체크리스트 항목 수정", error) } : {};
}

export async function deleteChecklistItem(id: string) {
  const contextResult = await getAdminContext();
  if (!contextResult.context) return { error: contextResult.error };

  const { supabase, profile } = contextResult.context;
  const { error } = await supabase.from("checklist_items").delete().eq("id", id).eq("school_id", profile.school_id);

  return error ? { error: formatSettingsError("체크리스트 항목 삭제", error) } : {};
}
