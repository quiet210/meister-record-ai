import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/students";
import type { CommentMode, GenerateResponse, RecordDraftLifecycleStatus, RecordFormPayload } from "@/lib/types";

type SaveRecordDraftInput = {
  mode: CommentMode;
  studentId?: string;
  payload: RecordFormPayload;
  result: GenerateResponse;
  saveMode?: "insert" | "replace-latest";
};

type SaveEditedRecordDraftInput = {
  mode: CommentMode;
  studentId?: string;
  payload: RecordFormPayload;
  result?: GenerateResponse | null;
  aiContent: string;
  editedContent: string;
  status?: Extract<RecordDraftLifecycleStatus, "editing" | "saved">;
};

type FinalizeRecordDraftInput = {
  mode: CommentMode;
  studentId?: string;
  payload: RecordFormPayload;
  result?: GenerateResponse | null;
  aiContent: string;
  editedContent: string;
  finalContent: string;
};

type UnfinalizeRecordDraftInput = Omit<FinalizeRecordDraftInput, "finalContent">;

type LatestDraftLookupInput = {
  mode: CommentMode;
  studentId?: string;
  schoolId: string;
  userId: string;
};

export type RecordDraftMutationResult = {
  id?: string;
  error?: string;
};

type RecordDraftContent = {
  finalContent?: string | null;
  editedContent?: string | null;
  aiContent?: string | null;
  draftText?: string | null;
};

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

async function findLatestDraftId(supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>, input: LatestDraftLookupInput) {
  let latestDraftQuery = supabase
    .from("record_drafts")
    .select("id")
    .eq("school_id", input.schoolId)
    .eq("user_id", input.userId)
    .eq("mode", input.mode)
    .order("created_at", { ascending: false })
    .limit(1);

  latestDraftQuery = input.studentId ? latestDraftQuery.eq("student_id", input.studentId) : latestDraftQuery.is("student_id", null);

  const { data, error } = await latestDraftQuery;
  return {
    id: data?.[0]?.id as string | undefined,
    error
  };
}

async function insertDraft(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  row: Record<string, unknown>
): Promise<RecordDraftMutationResult> {
  const { data, error } = await supabase.from("record_drafts").insert(row).select("id").single();
  if (error) return { error: error.message };
  return { id: data?.id as string | undefined };
}

async function updateLatestDraft(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  lookup: LatestDraftLookupInput,
  row: Record<string, unknown>,
  fallbackRow: Record<string, unknown>
): Promise<RecordDraftMutationResult> {
  const latestDraft = await findLatestDraftId(supabase, lookup);
  if (latestDraft.error) return { error: latestDraft.error.message };

  if (!latestDraft.id) {
    return insertDraft(supabase, fallbackRow);
  }

  const { data, error } = await supabase.from("record_drafts").update(row).eq("id", latestDraft.id).select("id").single();
  if (error) return { error: error.message };
  return { id: data?.id as string | undefined };
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

  const draftRow = {
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
    edited_by: null
  };

  if (input.saveMode === "replace-latest") {
    return updateLatestDraft(
      supabase,
      {
        mode: input.mode,
        studentId: input.studentId,
        schoolId: profileResult.profile.school_id,
        userId: profileResult.profile.id
      },
      draftRow,
      draftRow
    );
  }

  return insertDraft(supabase, draftRow);
}

export async function saveEditedRecordDraft(input: SaveEditedRecordDraftInput): Promise<RecordDraftMutationResult> {
  const supabase = createSupabaseBrowserClient();
  const profileResult = await ensureUserProfile();

  if (!supabase || !profileResult.profile) {
    return { error: getClientAndProfileError(supabase, profileResult.error) };
  }

  const normalizedAiContent = input.aiContent || input.result?.draft || input.editedContent;
  const normalizedEditedContent = input.editedContent || normalizedAiContent;
  const status = input.status || "saved";

  const updateRow = {
    input_payload: input.payload,
    ...(input.result ? { result_payload: input.result } : {}),
    draft_text: normalizedEditedContent || null,
    ai_content: normalizedAiContent || null,
    edited_content: normalizedEditedContent || null,
    status,
    edited_at: new Date().toISOString(),
    edited_by: profileResult.profile.id
  };

  const insertRow = {
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
    edited_at: new Date().toISOString(),
    finalized_at: null,
    edited_by: profileResult.profile.id
  };

  return updateLatestDraft(
    supabase,
    {
      mode: input.mode,
      studentId: input.studentId,
      schoolId: profileResult.profile.school_id,
      userId: profileResult.profile.id
    },
    updateRow,
    insertRow
  );
}

export async function finalizeRecordDraft(input: FinalizeRecordDraftInput): Promise<RecordDraftMutationResult> {
  const supabase = createSupabaseBrowserClient();
  const profileResult = await ensureUserProfile();

  if (!supabase || !profileResult.profile) {
    return { error: getClientAndProfileError(supabase, profileResult.error) };
  }

  const finalizedAt = new Date().toISOString();
  const normalizedAiContent = input.aiContent || input.result?.draft || input.editedContent || input.finalContent;
  const normalizedEditedContent = input.editedContent || normalizedAiContent;
  const normalizedFinalContent = input.finalContent || normalizedEditedContent;

  const updateRow = {
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
  };

  const insertRow = {
    school_id: profileResult.profile.school_id,
    user_id: profileResult.profile.id,
    student_id: input.studentId || null,
    mode: input.mode,
    result_payload: input.result || {
      draft: normalizedAiContent,
      evidence: [],
      warnings: []
    },
    ...updateRow
  };

  return updateLatestDraft(
    supabase,
    {
      mode: input.mode,
      studentId: input.studentId,
      schoolId: profileResult.profile.school_id,
      userId: profileResult.profile.id
    },
    updateRow,
    insertRow
  );
}

export async function unfinalizeRecordDraft(input: UnfinalizeRecordDraftInput): Promise<RecordDraftMutationResult> {
  const supabase = createSupabaseBrowserClient();
  const profileResult = await ensureUserProfile();

  if (!supabase || !profileResult.profile) {
    return { error: getClientAndProfileError(supabase, profileResult.error) };
  }

  const normalizedAiContent = input.aiContent || input.result?.draft || input.editedContent;
  const normalizedEditedContent = input.editedContent || normalizedAiContent;
  const updatedAt = new Date().toISOString();

  const updateRow = {
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
  };

  const insertRow = {
    school_id: profileResult.profile.school_id,
    user_id: profileResult.profile.id,
    student_id: input.studentId || null,
    mode: input.mode,
    result_payload: input.result || {
      draft: normalizedAiContent,
      evidence: [],
      warnings: []
    },
    ...updateRow
  };

  return updateLatestDraft(
    supabase,
    {
      mode: input.mode,
      studentId: input.studentId,
      schoolId: profileResult.profile.school_id,
      userId: profileResult.profile.id
    },
    updateRow,
    insertRow
  );
}
