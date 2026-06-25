import { NextResponse } from "next/server";
import { getCurriculumStandardsBySubject } from "@/lib/curriculum-server";
import { generateStudentRecordDraftWithGemini } from "@/lib/gemini";
import type { SubjectRecordFormPayload } from "@/lib/types";

const maxPromptStandards = 5;

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<SubjectRecordFormPayload, "mode">;
  const curriculumResult = await getCurriculumStandardsBySubject(body.subjectName, {
    schoolId: body.schoolId,
    limit: maxPromptStandards
  });
  const curriculumStandards = curriculumResult.standards.slice(0, maxPromptStandards);

  console.log(
    "[subject-comment curriculum standards]",
    JSON.stringify(
      {
        selectedSubject: body.subjectName,
        fetchedCount: curriculumResult.totalCount,
        promptIncludedCount: curriculumStandards.length
      },
      null,
      2
    )
  );

  if (curriculumResult.error) {
    console.warn("[subject-comment curriculum standards] lookup skipped", curriculumResult.error);
  }

  const result = await generateStudentRecordDraftWithGemini({ ...body, mode: "subject" }, "subject-comment", {
    curriculumStandards
  });

  return NextResponse.json(result);
}
