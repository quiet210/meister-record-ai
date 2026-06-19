import { NextResponse } from "next/server";
import { generateStudentRecordDraftWithGemini } from "@/lib/gemini";
import type { SubjectRecordFormPayload } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<SubjectRecordFormPayload, "mode">;
  const result = await generateStudentRecordDraftWithGemini({ ...body, mode: "subject" }, "subject-comment");
  return NextResponse.json(result);
}
