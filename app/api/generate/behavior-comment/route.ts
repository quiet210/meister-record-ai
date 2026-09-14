import { NextResponse } from "next/server";
import { logAiUsage } from "@/lib/ai-usage-server";
import { assertStudentBelongsToSchool, getGenerateApiAuthContext } from "@/lib/generate-api-auth";
import { generateStudentRecordDraftWithGemini } from "@/lib/gemini";
import type { BehaviorRecordFormPayload } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await getGenerateApiAuthContext(request);
  if (authResult.response) return authResult.response;

  const body = (await request.json()) as Omit<BehaviorRecordFormPayload, "mode">;
  const studentAccessError = await assertStudentBelongsToSchool(authResult.supabase, authResult.context, body.selectedStudentId);
  if (studentAccessError) return studentAccessError;

  const payload: BehaviorRecordFormPayload = {
    mode: "behavior",
    selectedStudentId: body.selectedStudentId,
    studentNo: body.studentNo,
    studentName: body.studentName,
    grade: body.grade,
    department: body.department,
    className: body.className,
    schoolLifeAreas: body.schoolLifeAreas,
    industrialAttitudes: body.industrialAttitudes,
    behaviorImprovements: body.behaviorImprovements,
    homeroomMemo: body.homeroomMemo,
    lengthOption: body.lengthOption,
    writingStyle: body.writingStyle,
    writingPerspective: body.writingPerspective
  };

  try {
    const result = await generateStudentRecordDraftWithGemini(payload, "behavior-comment");

    await logAiUsage({
      context: authResult.context,
      payload,
      result,
      mode: "behavior",
      studentId: payload.selectedStudentId,
      requestStatus: result.draft ? "success" : "failed",
      errorCode: result.errorCode
    });

    return NextResponse.json(result);
  } catch (error) {
    await logAiUsage({
      context: authResult.context,
      payload,
      mode: "behavior",
      studentId: payload.selectedStudentId,
      requestStatus: "failed",
      errorCode: error instanceof Error ? error.name : "unknown"
    });

    throw error;
  }
}
