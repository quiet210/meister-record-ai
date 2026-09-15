import { estimateAiUsageCostUsd, getConfiguredGeminiModel } from "@/lib/ai-pricing";
import type { GenerateApiAuthContext } from "@/lib/generate-api-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import type { CommentMode, GenerateResponse, RecordFormPayload } from "@/lib/types";

type AiUsageLogInput = {
  context: GenerateApiAuthContext;
  payload: RecordFormPayload;
  result?: GenerateResponse;
  mode: CommentMode;
  studentId?: string | null;
  subjectName?: string | null;
  requestStatus: "success" | "failed";
  errorCode?: string | number | null;
};

function normalizeErrorCode(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function usageFromResult(result: GenerateResponse | undefined) {
  return (
    result?.usage || {
      model: getConfiguredGeminiModel(),
      promptTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedContentTokens: 0
    }
  );
}

export async function logAiUsage(input: AiUsageLogInput) {
  try {
    const usage = usageFromResult(input.result);
    const estimatedCost = estimateAiUsageCostUsd(usage);
    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      console.warn("[ai-usage] Supabase service client is not configured; usage log skipped", {
        mode: input.mode,
        requestStatus: input.requestStatus,
        model: usage.model
      });
      return;
    }

    const { error } = await supabase.from("ai_usage_logs").insert({
      school_id: input.context.schoolId,
      user_id: input.context.userId,
      student_id: input.studentId || input.payload.selectedStudentId || null,
      mode: input.mode,
      subject_name: input.mode === "subject" ? input.subjectName || ("subjectName" in input.payload ? input.payload.subjectName : null) : null,
      model: usage.model,
      prompt_tokens: usage.promptTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
      cached_content_tokens: usage.cachedContentTokens || 0,
      estimated_cost_usd: estimatedCost.totalCostUsd,
      request_status: input.requestStatus,
      error_code: normalizeErrorCode(input.errorCode),
      metadata: {
        routeStatus: input.requestStatus,
        hasDraft: Boolean(input.result?.draft),
        warningCount: input.result?.warnings?.length || 0
      }
    });

    if (error) {
      console.warn("[ai-usage] usage log insert failed", {
        error,
        mode: input.mode,
        requestStatus: input.requestStatus,
        model: usage.model
      });
    }
  } catch (error) {
    console.warn("[ai-usage] usage log failed unexpectedly", {
      error,
      mode: input.mode,
      requestStatus: input.requestStatus
    });
  }
}
