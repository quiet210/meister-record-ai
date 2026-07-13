import { NextResponse } from "next/server";
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

  const result = await generateStudentRecordDraftWithGemini(payload, "behavior-comment");
  return NextResponse.json(result);
}
