import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/students";
import type { CommentMode, GenerateResponse, RecordDraftLifecycleStatus, RecordFormPayload } from "@/lib/types";

type RecordDraftRow = {
  id: string;
  student_id: string | null;
  mode: CommentMode;
  input_payload: RecordFormPayload | null;
  result_payload: GenerateResponse | null;
  draft_text: string | null;
  ai_content: string | null;
  edited_content: string | null;
  final_content: string | null;
  status: RecordDraftLifecycleStatus | null;
  created_at: string;
  updated_at: string | null;
  edited_at: string | null;
  finalized_at: string | null;
  edited_by: string | null;
};

export type StudentRecordDraft = {
  id: string;
  studentId: string;
  mode: CommentMode;
  inputPayload: RecordFormPayload | null;
  resultPayload: GenerateResponse | null;
  draftText: string;
  aiContent: string;
  editedContent: string;
  finalContent: string;
  status: RecordDraftLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  editedAt: string;
  finalizedAt: string;
  editedBy: string;
};

export type StudentRecordDraftsResult = {
  drafts: StudentRecordDraft[];
  error?: string;
};

const recordDraftColumns =
  "id, student_id, mode, input_payload, result_payload, draft_text, ai_content, edited_content, final_content, status, created_at, updated_at, edited_at, finalized_at, edited_by";

function normalizeStatus(status: string | null): RecordDraftLifecycleStatus {
  if (status === "editing" || status === "saved" || status === "finalized") return status;
  return "ai_generated";
}

function normalizeDraft(row: RecordDraftRow): StudentRecordDraft | null {
  if (!row.student_id) return null;

  const draftText = row.draft_text || "";
  const aiContent = row.ai_content || draftText;
  const editedContent = row.edited_content || aiContent || draftText;

  return {
    id: row.id,
    studentId: row.student_id,
    mode: row.mode,
    inputPayload: row.input_payload,
    resultPayload: row.result_payload,
    draftText,
    aiContent,
    editedContent,
    finalContent: row.final_content || "",
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at || "",
    editedAt: row.edited_at || "",
    finalizedAt: row.finalized_at || "",
    editedBy: row.edited_by || ""
  };
}

export async function listStudentRecordDrafts(): Promise<StudentRecordDraftsResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return {
      drafts: [],
      error: "Supabase 환경변수가 설정되지 않았습니다."
    };
  }

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) {
    return {
      drafts: [],
      error: profileResult.error || "사용자 프로필을 찾지 못했습니다."
    };
  }

  const { data, error } = await supabase
    .from("record_drafts")
    .select(recordDraftColumns)
    .eq("school_id", profileResult.profile.school_id)
    .eq("user_id", profileResult.profile.id)
    .in("mode", ["subject", "behavior"])
    .not("student_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      drafts: [],
      error: `학생부 기록 조회 실패: ${error.message}`
    };
  }

  return {
    drafts: ((data || []) as RecordDraftRow[]).map(normalizeDraft).filter((draft): draft is StudentRecordDraft => Boolean(draft))
  };
}
