import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/students";
import type { CommentMode, GenerateResponse, RecordFormPayload } from "@/lib/types";

type SaveRecordDraftInput = {
  mode: CommentMode;
  studentId?: string;
  payload: RecordFormPayload;
  result: GenerateResponse;
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

  const { error } = await supabase.from("record_drafts").insert({
    school_id: profileResult.profile.school_id,
    user_id: profileResult.profile.id,
    student_id: input.studentId || null,
    mode: input.mode,
    input_payload: input.payload,
    result_payload: input.result,
    draft_text: input.result.draft || null
  });

  return error ? { error: error.message } : {};
}
