import { NextResponse } from "next/server";
import { generateStudentRecordDraftWithGemini } from "@/lib/gemini";
import type { BehaviorRecordFormPayload } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<BehaviorRecordFormPayload, "mode">;
  const result = await generateStudentRecordDraftWithGemini({ ...body, mode: "behavior" }, "behavior-comment");
  return NextResponse.json(result);
}
