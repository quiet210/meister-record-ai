import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ensureUserProfile, type UserProfile } from "@/lib/students";

export type AccountProfile = UserProfile;

export type SchoolChangeRequestStatus = "pending" | "approved" | "rejected";

export type SchoolChangeRequest = {
  id: string;
  userId: string;
  currentSchoolId: string;
  requestedSchoolId: string;
  requestedSchoolName: string;
  reason: string;
  status: SchoolChangeRequestStatus;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
  requesterName?: string;
  requesterEmail?: string;
};

type SchoolChangeRequestRow = {
  id: string;
  user_id: string;
  current_school_id: string;
  requested_school_id: string | null;
  requested_school_name: string | null;
  reason: string;
  status: SchoolChangeRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type UserSummaryRow = {
  id: string;
  name: string;
  email: string;
};

const requestColumns =
  "id, user_id, current_school_id, requested_school_id, requested_school_name, reason, status, reviewed_by, reviewed_at, created_at, updated_at";

function normalizeRequest(row: SchoolChangeRequestRow, requester?: UserSummaryRow): SchoolChangeRequest {
  return {
    id: row.id,
    userId: row.user_id,
    currentSchoolId: row.current_school_id,
    requestedSchoolId: row.requested_school_id || "",
    requestedSchoolName: row.requested_school_name || "",
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewed_by || "",
    reviewedAt: row.reviewed_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    requesterName: requester?.name,
    requesterEmail: requester?.email
  };
}

function formatError(action: string, error: { message?: string }) {
  return `${action} 실패: ${error.message || "알 수 없는 오류가 발생했습니다."}`;
}

async function getClientAndProfile() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 환경변수가 설정되지 않았습니다." };

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) {
    return { error: profileResult.error || "사용자 프로필을 찾지 못했습니다." };
  }

  return {
    supabase,
    profile: profileResult.profile
  };
}

export async function getAccountProfile(): Promise<{ profile?: AccountProfile; error?: string }> {
  const result = await getClientAndProfile();
  if ("error" in result) return { error: result.error };
  return { profile: result.profile };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ sessionPreserved?: boolean; error?: string }> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 환경변수가 설정되지 않았습니다." };

  const currentPassword = input.currentPassword.trim();
  const newPassword = input.newPassword.trim();
  const confirmPassword = input.confirmPassword.trim();
  if (!currentPassword) return { error: "현재 비밀번호를 입력하세요." };
  if (!newPassword) return { error: "새 비밀번호를 입력하세요." };
  if (newPassword !== confirmPassword) return { error: "새 비밀번호와 확인값이 일치하지 않습니다." };
  if (newPassword.length < 6) return { error: "새 비밀번호는 최소 6자 이상이어야 합니다." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const email = userData.user?.email || "";
  if (userError || !email) return { error: "로그인 세션을 확인하지 못했습니다." };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword
  });
  if (verifyError) return { error: `현재 비밀번호 확인 실패: ${verifyError.message}` };

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (updateError) return { error: `비밀번호 변경 실패: ${updateError.message}` };

  const { data: sessionData } = await supabase.auth.getSession();
  return {
    sessionPreserved: Boolean(sessionData.session)
  };
}

export async function listMySchoolChangeRequests(): Promise<{ requests: SchoolChangeRequest[]; error?: string }> {
  const result = await getClientAndProfile();
  if ("error" in result) return { requests: [], error: result.error };

  const { data, error } = await result.supabase
    .from("school_change_requests")
    .select(requestColumns)
    .eq("user_id", result.profile.id)
    .order("created_at", { ascending: false });

  if (error) return { requests: [], error: formatError("학교 변경 요청 조회", error) };
  return {
    requests: ((data || []) as SchoolChangeRequestRow[]).map((row) => normalizeRequest(row))
  };
}

export async function createSchoolChangeRequest(input: {
  requestedSchoolId: string;
  requestedSchoolName: string;
  reason: string;
}): Promise<{ error?: string }> {
  const result = await getClientAndProfile();
  if ("error" in result) return { error: result.error };

  const requestedSchoolId = input.requestedSchoolId.trim();
  const requestedSchoolName = input.requestedSchoolName.trim();
  const reason = input.reason.trim();
  if (!requestedSchoolId && !requestedSchoolName) return { error: "변경 희망 학교 ID 또는 학교명을 입력하세요." };
  if (!reason) return { error: "요청 사유를 입력하세요." };

  const { error } = await result.supabase.from("school_change_requests").insert({
    user_id: result.profile.id,
    current_school_id: result.profile.school_id,
    requested_school_id: requestedSchoolId || null,
    requested_school_name: requestedSchoolName || null,
    reason,
    status: "pending"
  });

  return error ? { error: formatError("학교 변경 요청 생성", error) } : {};
}

export async function cancelSchoolChangeRequest(id: string): Promise<{ error?: string }> {
  const result = await getClientAndProfile();
  if ("error" in result) return { error: result.error };

  const { error } = await result.supabase
    .from("school_change_requests")
    .delete()
    .eq("id", id)
    .eq("user_id", result.profile.id)
    .eq("status", "pending");

  return error ? { error: formatError("학교 변경 요청 취소", error) } : {};
}

export async function listAdminSchoolChangeRequests(): Promise<{ requests: SchoolChangeRequest[]; error?: string }> {
  const result = await getClientAndProfile();
  if ("error" in result) return { requests: [], error: result.error };
  if (result.profile.role !== "admin") return { requests: [], error: "관리자 권한이 필요합니다." };

  const { data, error } = await result.supabase
    .from("school_change_requests")
    .select(requestColumns)
    .eq("current_school_id", result.profile.school_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return { requests: [], error: formatError("학교 변경 요청 목록 조회", error) };

  const rows = (data || []) as SchoolChangeRequestRow[];
  const requesterIds = Array.from(new Set(rows.map((row) => row.user_id)));
  let usersById = new Map<string, UserSummaryRow>();

  if (requesterIds.length > 0) {
    const { data: users, error: userError } = await result.supabase
      .from("users")
      .select("id, name, email")
      .eq("school_id", result.profile.school_id)
      .in("id", requesterIds);

    if (userError) return { requests: [], error: formatError("요청자 정보 조회", userError) };
    usersById = new Map(((users || []) as UserSummaryRow[]).map((user) => [user.id, user]));
  }

  return {
    requests: rows.map((row) => normalizeRequest(row, usersById.get(row.user_id)))
  };
}

export async function reviewSchoolChangeRequest(id: string, action: "approve" | "reject"): Promise<{ error?: string }> {
  const result = await getClientAndProfile();
  if ("error" in result) return { error: result.error };
  if (result.profile.role !== "admin") return { error: "관리자 권한이 필요합니다." };

  const functionName = action === "approve" ? "approve_school_change_request" : "reject_school_change_request";
  const { error } = await result.supabase.rpc(functionName, {
    p_request_id: id
  });

  return error ? { error: formatError(action === "approve" ? "학교 변경 승인" : "학교 변경 반려", error) } : {};
}
