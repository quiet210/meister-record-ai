import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/students";
import type { CommentMode, GenerateResponse, RecordFormPayload } from "@/lib/types";

type SaveRecordDraftInput = {
  mode: CommentMode;
  studentId?: string;
  payload: RecordFormPayload;
  result: GenerateResponse;
  saveMode?: "insert" | "replace-latest";
};

export async function saveRecordDraft(input: SaveRecordDraftInput) {
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
    draft_text: input.result.draft || null
  };

  if (input.saveMode === "replace-latest") {
    let latestDraftQuery = supabase
      .from("record_drafts")
      .select("id")
      .eq("school_id", profileResult.profile.school_id)
      .eq("user_id", profileResult.profile.id)
      .eq("mode", input.mode)
      .order("created_at", { ascending: false })
      .limit(1);

    latestDraftQuery = input.studentId ? latestDraftQuery.eq("student_id", input.studentId) : latestDraftQuery.is("student_id", null);

    const { data: latestDrafts, error: latestDraftError } = await latestDraftQuery;
    if (latestDraftError) {
      return { error: latestDraftError.message };
    }

    const latestDraftId = latestDrafts?.[0]?.id;
    if (latestDraftId) {
      const { error: updateError } = await supabase.from("record_drafts").update(draftRow).eq("id", latestDraftId);
      return updateError ? { error: updateError.message } : {};
    }
  }

  const { error } = await supabase.from("record_drafts").insert(draftRow);

  return error ? { error: error.message } : {};
}
