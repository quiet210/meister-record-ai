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

  const result = await generateStudentRecordDraftWithGemini({ ...body, schoolId: authResult.context.schoolId, mode: "behavior" }, "behavior-comment");
  return NextResponse.json(result);
}
