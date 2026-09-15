import { estimateUsdToKrw } from "@/lib/ai-pricing";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/students";
import type { CommentMode } from "@/lib/types";

export type AiUsageDatePreset = "today" | "last7days" | "month" | "custom";

export type AiUsageLogStatus = "success" | "failed";

export type AiUsageLogRow = {
  id: string;
  school_id: string;
  user_id: string;
  student_id: string | null;
  mode: CommentMode;
  subject_name: string | null;
  model: string;
  prompt_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_content_tokens: number;
  estimated_cost_usd: number;
  request_status: AiUsageLogStatus;
  error_code: string | null;
  created_at: string;
};

export type AiUsageUserSummary = {
  id: string;
  name: string;
  email: string;
};

export type AiUsageTotals = {
  requestCount: number;
  successCount: number;
  failedCount: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  estimatedCostKrw: number;
};

export type AiUsageModeBreakdown = {
  mode: CommentMode;
  requestCount: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type AiUsageModelBreakdown = {
  model: string;
  requestCount: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type AiUsageTeacherBreakdown = {
  userId: string;
  name: string;
  email: string;
  requestCount: number;
  subjectCount: number;
  behaviorCount: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type AiUsageErrorSummary = {
  errorCode: string;
  count: number;
};

export type AiUsageFailureItem = {
  id: string;
  createdAt: string;
  mode: CommentMode;
  userName: string;
  userEmail: string;
  model: string;
  errorCode: string;
};

export type AdminAiUsageReport = {
  from: string;
  to: string;
  totals: AiUsageTotals;
  byMode: AiUsageModeBreakdown[];
  byModel: AiUsageModelBreakdown[];
  byTeacher: AiUsageTeacherBreakdown[];
  errorSummary: AiUsageErrorSummary[];
  recentFailures: AiUsageFailureItem[];
};

type UserSummaryRow = {
  id: string;
  name: string;
  email: string;
};

const usageColumns =
  "id, school_id, user_id, student_id, mode, subject_name, model, prompt_tokens, output_tokens, total_tokens, cached_content_tokens, estimated_cost_usd, request_status, error_code, created_at";

function addTotals(totals: AiUsageTotals, row: AiUsageLogRow) {
  totals.requestCount += 1;
  totals.successCount += row.request_status === "success" ? 1 : 0;
  totals.failedCount += row.request_status === "failed" ? 1 : 0;
  totals.promptTokens += row.prompt_tokens || 0;
  totals.outputTokens += row.output_tokens || 0;
  totals.totalTokens += row.total_tokens || 0;
  totals.estimatedCostUsd += Number(row.estimated_cost_usd || 0);
}

function emptyTotals(): AiUsageTotals {
  return {
    requestCount: 0,
    successCount: 0,
    failedCount: 0,
    promptTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    estimatedCostKrw: 0
  };
}

function userLabel(userId: string, usersById: Map<string, AiUsageUserSummary>) {
  const user = usersById.get(userId);
  return {
    name: user?.name || "알 수 없음",
    email: user?.email || userId
  };
}

function buildReport(rows: AiUsageLogRow[], usersById: Map<string, AiUsageUserSummary>, from: string, to: string): AdminAiUsageReport {
  const totals = emptyTotals();
  const byModeMap = new Map<CommentMode, AiUsageModeBreakdown>();
  const byModelMap = new Map<string, AiUsageModelBreakdown>();
  const byTeacherMap = new Map<string, AiUsageTeacherBreakdown>();
  const errorMap = new Map<string, number>();

  rows.forEach((row) => {
    addTotals(totals, row);

    const modeItem =
      byModeMap.get(row.mode) ||
      ({
        mode: row.mode,
        requestCount: 0,
        totalTokens: 0,
        estimatedCostUsd: 0
      } satisfies AiUsageModeBreakdown);
    modeItem.requestCount += 1;
    modeItem.totalTokens += row.total_tokens || 0;
    modeItem.estimatedCostUsd += Number(row.estimated_cost_usd || 0);
    byModeMap.set(row.mode, modeItem);

    const modelItem =
      byModelMap.get(row.model) ||
      ({
        model: row.model,
        requestCount: 0,
        totalTokens: 0,
        estimatedCostUsd: 0
      } satisfies AiUsageModelBreakdown);
    modelItem.requestCount += 1;
    modelItem.totalTokens += row.total_tokens || 0;
    modelItem.estimatedCostUsd += Number(row.estimated_cost_usd || 0);
    byModelMap.set(row.model, modelItem);

    const teacher = userLabel(row.user_id, usersById);
    const teacherItem =
      byTeacherMap.get(row.user_id) ||
      ({
        userId: row.user_id,
        name: teacher.name,
        email: teacher.email,
        requestCount: 0,
        subjectCount: 0,
        behaviorCount: 0,
        totalTokens: 0,
        estimatedCostUsd: 0
      } satisfies AiUsageTeacherBreakdown);
    teacherItem.requestCount += 1;
    teacherItem.subjectCount += row.mode === "subject" ? 1 : 0;
    teacherItem.behaviorCount += row.mode === "behavior" ? 1 : 0;
    teacherItem.totalTokens += row.total_tokens || 0;
    teacherItem.estimatedCostUsd += Number(row.estimated_cost_usd || 0);
    byTeacherMap.set(row.user_id, teacherItem);

    if (row.request_status === "failed") {
      const errorCode = row.error_code || "unknown";
      errorMap.set(errorCode, (errorMap.get(errorCode) || 0) + 1);
    }
  });

  totals.estimatedCostKrw = estimateUsdToKrw(totals.estimatedCostUsd);

  return {
    from,
    to,
    totals,
    byMode: Array.from(byModeMap.values()).sort((a, b) => b.requestCount - a.requestCount),
    byModel: Array.from(byModelMap.values()).sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd),
    byTeacher: Array.from(byTeacherMap.values()).sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd),
    errorSummary: Array.from(errorMap.entries())
      .map(([errorCode, count]) => ({ errorCode, count }))
      .sort((a, b) => b.count - a.count),
    recentFailures: rows
      .filter((row) => row.request_status === "failed")
      .slice(0, 10)
      .map((row) => {
        const teacher = userLabel(row.user_id, usersById);
        return {
          id: row.id,
          createdAt: row.created_at,
          mode: row.mode,
          userName: teacher.name,
          userEmail: teacher.email,
          model: row.model,
          errorCode: row.error_code || "unknown"
        };
      })
  };
}

export async function loadAdminAiUsageReport(input: { from: string; to: string }): Promise<{ report?: AdminAiUsageReport; error?: string }> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 환경변수가 설정되지 않았습니다." };

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) return { error: profileResult.error || "사용자 프로필을 찾지 못했습니다." };
  if (profileResult.profile.role !== "admin") return { error: "관리자 권한이 필요합니다." };

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select(usageColumns)
    .eq("school_id", profileResult.profile.school_id)
    .gte("created_at", input.from)
    .lt("created_at", input.to)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) return { error: `AI 사용량 조회 실패: ${error.message}` };

  const rows = ((data || []) as AiUsageLogRow[]).map((row) => ({
    ...row,
    estimated_cost_usd: Number(row.estimated_cost_usd || 0)
  }));
  const userIds = Array.from(new Set(rows.map((row) => row.user_id))).filter(Boolean);
  const usersById = new Map<string, AiUsageUserSummary>();

  if (userIds.length > 0) {
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("school_id", profileResult.profile.school_id)
      .in("id", userIds);

    if (userError) return { error: `AI 사용량 사용자 조회 실패: ${userError.message}` };
    ((users || []) as UserSummaryRow[]).forEach((user) => {
      usersById.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email
      });
    });
  }

  return {
    report: buildReport(rows, usersById, input.from, input.to)
  };
}
