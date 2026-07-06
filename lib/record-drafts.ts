import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/students";
import type { CommentMode, GenerateResponse, RecordDraftLifecycleStatus, RecordFormPayload } from "@/lib/types";

type SaveRecordDraftInput = {
  mode: CommentMode;
  studentId?: string;
  draftId?: string;
  payload: RecordFormPayload;
  result: GenerateResponse;
};

type SaveEditedRecordDraftInput = {
  mode: CommentMode;
  studentId?: string;
  draftId?: string;
  payload: RecordFormPayload;
  result?: GenerateResponse | null;
  aiContent: string;
  editedContent: string;
  status?: Extract<RecordDraftLifecycleStatus, "editing" | "saved">;
  allowFinalizedUpdate?: boolean;
};

type FinalizeRecordDraftInput = {
  mode: CommentMode;
  studentId?: string;
  draftId?: string;
  payload: RecordFormPayload;
  result?: GenerateResponse | null;
  aiContent: string;
  editedContent: string;
  finalContent: string;
};

type UnfinalizeRecordDraftInput = Omit<FinalizeRecordDraftInput, "finalContent">;

type DraftScope = {
  subjectName: string | null;
  academicYear: string | null;
  semester: string | null;
};

type DraftLookupInput = DraftScope & {
  mode: CommentMode;
  studentId?: string;
  schoolId: string;
  userId: string;
};

type ExistingDraft = {
  id: string;
  status: RecordDraftLifecycleStatus;
  versionNo: number;
};

type DraftMutationAction = "inserted" | "updated";

export type RecordDraftMutationResult = {
  id?: string;
  action?: DraftMutationAction;
  blockedByFinalized?: boolean;
  error?: string;
};

type RecordDraftContent = {
  finalContent?: string | null;
  editedContent?: string | null;
  aiContent?: string | null;
  draftText?: string | null;
};

type SupabaseBrowserClient = NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;

export const recordDraftLifecycleLabels: Record<RecordDraftLifecycleStatus, string> = {
  ai_generated: "AI 생성됨",
  editing: "수정 중",
  saved: "저장 완료",
  finalized: "최종 확정"
};

export function getEffectiveRecordContent(content: RecordDraftContent) {
  return content.finalContent?.trim() || content.editedContent?.trim() || content.aiContent?.trim() || content.draftText?.trim() || "";
}

export function getRecordDraftLifecycleStatusMeta(status: RecordDraftLifecycleStatus) {
  if (status === "finalized") {
    return {
      label: recordDraftLifecycleLabels.finalized,
      dotClassName: "bg-emerald-500",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700"
    };
  }

  if (status === "saved") {
    return {
      label: recordDraftLifecycleLabels.saved,
      dotClassName: "bg-blue-500",
      className: "border-blue-200 bg-blue-50 text-blue-700"
    };
  }

  if (status === "editing") {
    return {
      label: recordDraftLifecycleLabels.editing,
      dotClassName: "bg-amber-400",
      className: "border-amber-200 bg-amber-50 text-amber-700"
    };
  }

  return {
    label: recordDraftLifecycleLabels.ai_generated,
    dotClassName: "bg-slate-300",
    className: "border-slate-200 bg-slate-50 text-slate-600"
  };
}

function getClientAndProfileError(supabase: ReturnType<typeof createSupabaseBrowserClient>, profileError?: string) {
  if (!supabase) {
    return "Supabase 환경변수가 설정되지 않았습니다.";
  }

  return profileError || "사용자 프로필을 찾지 못했습니다.";
}

function normalizeLifecycleStatus(status: string | null | undefined): RecordDraftLifecycleStatus {
  if (status === "editing" || status === "saved" || status === "finalized") return status;
  return "ai_generated";
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getPayloadText(payload: RecordFormPayload, keys: string[]) {
  const payloadRecord = payload as Record<string, unknown>;

  for (const key of keys) {
    const value = normalizeOptionalText(payloadRecord[key]);
    if (value) return value;
  }

  return null;
}

function getDraftScope(mode: CommentMode, payload: RecordFormPayload): DraftScope {
  return {
    subjectName: mode === "subject" ? getPayloadText(payload, ["subjectName", "subject_name"]) : null,
    academicYear: getPayloadText(payload, ["academicYear", "academic_year"]),
    semester: getPayloadText(payload, ["semester"])
  };
}

function withDraftScope(row: Record<string, unknown>, scope: DraftScope) {
  return {
    ...row,
    subject_name: scope.subjectName,
    academic_year: scope.academicYear,
    semester: scope.semester
  };
}

function applyNullableFilter<TQuery extends { eq: (column: string, value: string) => TQuery; is: (column: string, value: null) => TQuery }>(
  query: TQuery,
  column: string,
  value?: string | null
) {
  return value ? query.eq(column, value) : query.is(column, null);
}

function parseExistingDraft(data: unknown): ExistingDraft | undefined {
  if (!data || typeof data !== "object") return undefined;
  const row = data as { id?: unknown; status?: unknown; version_no?: unknown };
  if (typeof row.id !== "string") return undefined;

  return {
    id: row.id,
    status: normalizeLifecycleStatus(typeof row.status === "string" ? row.status : null),
    versionNo: typeof row.version_no === "number" && Number.isFinite(row.version_no) ? row.version_no : 1
  };
}

async function findDraftById(supabase: SupabaseBrowserClient, draftId: string, schoolId: string, userId: string) {
  const { data, error } = await supabase
    .from("record_drafts")
    .select("id, status, version_no")
    .eq("id", draftId)
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    draft: parseExistingDraft(data),
    error
  };
}

async function findCurrentDraft(supabase: SupabaseBrowserClient, input: DraftLookupInput) {
  let currentDraftQuery = supabase
    .from("record_drafts")
    .select("id, status, version_no")
    .eq("school_id", input.schoolId)
    .eq("user_id", input.userId)
    .eq("mode", input.mode)
    .eq("is_current", true)
    .limit(1);

  currentDraftQuery = input.studentId ? currentDraftQuery.eq("student_id", input.studentId) : currentDraftQuery.is("student_id", null);
  currentDraftQuery = applyNullableFilter(currentDraftQuery, "subject_name", input.subjectName);
  currentDraftQuery = applyNullableFilter(currentDraftQuery, "academic_year", input.academicYear);
  currentDraftQuery = applyNullableFilter(currentDraftQuery, "semester", input.semester);

  const { data, error } = await currentDraftQuery.maybeSingle();
  return {
    draft: parseExistingDraft(data),
    error
  };
}

function finalizedBlockResult(): RecordDraftMutationResult {
  return {
    blockedByFinalized: true,
    error: "이미 최종 확정된 현재본입니다. 최종 확정을 해제하거나 새 AI 결과 사용을 명시적으로 선택한 뒤 저장하세요."
  };
}

async function insertDraft(
  supabase: SupabaseBrowserClient,
  row: Record<string, unknown>
): Promise<RecordDraftMutationResult> {
  const { data, error } = await supabase.from("record_drafts").insert(row).select("id").single();
  if (error) return { error: error.message };
  return { id: data?.id as string | undefined, action: "inserted" };
}

async function updateDraftById(
  supabase: SupabaseBrowserClient,
  draftId: string,
  ownership: { schoolId: string; userId: string },
  row: Record<string, unknown>,
  options: { allowFinalizedUpdate?: boolean } = {}
): Promise<RecordDraftMutationResult> {
  const existingDraft = await findDraftById(supabase, draftId, ownership.schoolId, ownership.userId);
  if (existingDraft.error) return { error: existingDraft.error.message };
  if (!existingDraft.draft) return { error: "수정할 학생부 현재본을 찾지 못했습니다." };
  if (existingDraft.draft.status === "finalized" && !options.allowFinalizedUpdate) return finalizedBlockResult();

  const { data, error } = await supabase
    .from("record_drafts")
    .update(row)
    .eq("id", draftId)
    .eq("school_id", ownership.schoolId)
    .eq("user_id", ownership.userId)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data?.id as string | undefined, action: "updated" };
}

async function updateCurrentDraftOrInsert(
  supabase: SupabaseBrowserClient,
  lookup: DraftLookupInput,
  updateRow: Record<string, unknown>,
  insertRow: Record<string, unknown>,
  options: { draftId?: string; allowFinalizedUpdate?: boolean; bumpVersion?: boolean } = {}
): Promise<RecordDraftMutationResult> {
  if (options.draftId) {
    return updateDraftById(
      supabase,
      options.draftId,
      {
        schoolId: lookup.schoolId,
        userId: lookup.userId
      },
      updateRow,
      { allowFinalizedUpdate: options.allowFinalizedUpdate }
    );
  }

  const currentDraft = await findCurrentDraft(supabase, lookup);
  if (currentDraft.error) return { error: currentDraft.error.message };

  if (!currentDraft.draft) {
    return insertDraft(supabase, insertRow);
  }

  if (currentDraft.draft.status === "finalized" && !options.allowFinalizedUpdate) return finalizedBlockResult();

  return updateDraftById(
    supabase,
    currentDraft.draft.id,
    {
      schoolId: lookup.schoolId,
      userId: lookup.userId
    },
    options.bumpVersion ? { ...updateRow, version_no: currentDraft.draft.versionNo + 1 } : updateRow,
    { allowFinalizedUpdate: options.allowFinalizedUpdate }
  );
}

export async function saveRecordDraft(input: SaveRecordDraftInput): Promise<RecordDraftMutationResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { error: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) {
    return { error: profileResult.error || "사용자 프로필을 찾지 못했습니다." };
  }

  const scope = getDraftScope(input.mode, input.payload);
  const lookup = {
    mode: input.mode,
    studentId: input.studentId,
    schoolId: profileResult.profile.school_id,
    userId: profileResult.profile.id,
    ...scope
  };
  const draftRow = withDraftScope(
    {
      school_id: profileResult.profile.school_id,
      user_id: profileResult.profile.id,
      student_id: input.studentId || null,
      mode: input.mode,
      input_payload: input.payload,
      result_payload: input.result,
      draft_text: input.result.draft || null,
      ai_content: input.result.draft || null,
      edited_content: input.result.draft || null,
      final_content: null,
      status: "ai_generated" satisfies RecordDraftLifecycleStatus,
      edited_at: null,
      finalized_at: null,
      edited_by: null,
      is_current: true
    },
    scope
  );

  return updateCurrentDraftOrInsert(supabase, lookup, draftRow, { ...draftRow, version_no: 1 }, { draftId: input.draftId, bumpVersion: true });
}

export async function saveEditedRecordDraft(input: SaveEditedRecordDraftInput): Promise<RecordDraftMutationResult> {
  const supabase = createSupabaseBrowserClient();
  const profileResult = await ensureUserProfile();

  if (!supabase || !profileResult.profile) {
    return { error: getClientAndProfileError(supabase, profileResult.error) };
  }

  const scope = getDraftScope(input.mode, input.payload);
  const normalizedAiContent = input.aiContent || input.result?.draft || input.editedContent;
  const normalizedEditedContent = input.editedContent || normalizedAiContent;
  const status = input.status || "saved";
  const editedAt = new Date().toISOString();

  const updateRow = withDraftScope(
    {
      input_payload: input.payload,
      ...(input.result ? { result_payload: input.result } : {}),
      draft_text: normalizedEditedContent || null,
      ai_content: normalizedAiContent || null,
      edited_content: normalizedEditedContent || null,
      ...(input.allowFinalizedUpdate ? { final_content: null, finalized_at: null } : {}),
      status,
      edited_at: editedAt,
      edited_by: profileResult.profile.id
    },
    scope
  );

  const insertRow = withDraftScope(
    {
      school_id: profileResult.profile.school_id,
      user_id: profileResult.profile.id,
      student_id: input.studentId || null,
      mode: input.mode,
      input_payload: input.payload,
      result_payload: input.result || {
        draft: normalizedAiContent,
        evidence: [],
        warnings: []
      },
      draft_text: normalizedEditedContent || null,
      ai_content: normalizedAiContent || null,
      edited_content: normalizedEditedContent || null,
      final_content: null,
      status,
      edited_at: editedAt,
      finalized_at: null,
      edited_by: profileResult.profile.id,
      is_current: true,
      version_no: 1
    },
    scope
  );

  return updateCurrentDraftOrInsert(
    supabase,
    {
      mode: input.mode,
      studentId: input.studentId,
      schoolId: profileResult.profile.school_id,
      userId: profileResult.profile.id,
      ...scope
    },
    updateRow,
    insertRow,
    {
      draftId: input.draftId,
      allowFinalizedUpdate: input.allowFinalizedUpdate
    }
  );
}

export async function finalizeRecordDraft(input: FinalizeRecordDraftInput): Promise<RecordDraftMutationResult> {
  const supabase = createSupabaseBrowserClient();
  const profileResult = await ensureUserProfile();

  if (!supabase || !profileResult.profile) {
    return { error: getClientAndProfileError(supabase, profileResult.error) };
  }

  const scope = getDraftScope(input.mode, input.payload);
  const finalizedAt = new Date().toISOString();
  const normalizedAiContent = input.aiContent || input.result?.draft || input.editedContent || input.finalContent;
  const normalizedEditedContent = input.editedContent || normalizedAiContent;
  const normalizedFinalContent = input.finalContent || normalizedEditedContent;

  const updateRow = withDraftScope(
    {
      input_payload: input.payload,
      ...(input.result ? { result_payload: input.result } : {}),
      draft_text: normalizedFinalContent || null,
      ai_content: normalizedAiContent || null,
      edited_content: normalizedEditedContent || null,
      final_content: normalizedFinalContent || null,
      status: "finalized" satisfies RecordDraftLifecycleStatus,
      edited_at: finalizedAt,
      finalized_at: finalizedAt,
      edited_by: profileResult.profile.id
    },
    scope
  );

  const insertRow = withDraftScope(
    {
      school_id: profileResult.profile.school_id,
      user_id: profileResult.profile.id,
      student_id: input.studentId || null,
      mode: input.mode,
      result_payload: input.result || {
        draft: normalizedAiContent,
        evidence: [],
        warnings: []
      },
      is_current: true,
      version_no: 1,
      ...updateRow
    },
    scope
  );

  return updateCurrentDraftOrInsert(
    supabase,
    {
      mode: input.mode,
      studentId: input.studentId,
      schoolId: profileResult.profile.school_id,
      userId: profileResult.profile.id,
      ...scope
    },
    updateRow,
    insertRow,
    {
      draftId: input.draftId,
      allowFinalizedUpdate: true
    }
  );
}

export async function unfinalizeRecordDraft(input: UnfinalizeRecordDraftInput): Promise<RecordDraftMutationResult> {
  const supabase = createSupabaseBrowserClient();
  const profileResult = await ensureUserProfile();

  if (!supabase || !profileResult.profile) {
    return { error: getClientAndProfileError(supabase, profileResult.error) };
  }

  const scope = getDraftScope(input.mode, input.payload);
  const normalizedAiContent = input.aiContent || input.result?.draft || input.editedContent;
  const normalizedEditedContent = input.editedContent || normalizedAiContent;
  const updatedAt = new Date().toISOString();

  const updateRow = withDraftScope(
    {
      input_payload: input.payload,
      ...(input.result ? { result_payload: input.result } : {}),
      draft_text: normalizedEditedContent || null,
      ai_content: normalizedAiContent || null,
      edited_content: normalizedEditedContent || null,
      final_content: null,
      status: "saved" satisfies RecordDraftLifecycleStatus,
      edited_at: updatedAt,
      finalized_at: null,
      edited_by: profileResult.profile.id
    },
    scope
  );

  const insertRow = withDraftScope(
    {
      school_id: profileResult.profile.school_id,
      user_id: profileResult.profile.id,
      student_id: input.studentId || null,
      mode: input.mode,
      result_payload: input.result || {
        draft: normalizedAiContent,
        evidence: [],
        warnings: []
      },
      is_current: true,
      version_no: 1,
      ...updateRow
    },
    scope
  );

  return updateCurrentDraftOrInsert(
    supabase,
    {
      mode: input.mode,
      studentId: input.studentId,
      schoolId: profileResult.profile.school_id,
      userId: profileResult.profile.id,
      ...scope
    },
    updateRow,
    insertRow,
    {
      draftId: input.draftId,
      allowFinalizedUpdate: true
    }
  );
}
