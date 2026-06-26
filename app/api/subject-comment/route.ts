import { NextResponse } from "next/server";
import { selectCurriculumStandardsForSubjectComment } from "@/lib/curriculum-server";
import { generateStudentRecordDraftWithGemini } from "@/lib/gemini";
import type { SubjectRecordFormPayload } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<SubjectRecordFormPayload, "mode">;
  const curriculumResult = await selectCurriculumStandardsForSubjectComment(body);
  const curriculumStandards = curriculumResult.standards;

  console.log(
    "[subject-comment curriculum standards]",
    JSON.stringify(
      {
        selectedSubject: body.subjectName,
        totalCandidateCount: curriculumResult.totalCount,
        selectedStandards: curriculumStandards.map((standard) => ({
          unitName: standard.unitName,
          achievementStandard: standard.achievementStandard,
          keywords: standard.keywords
        })),
        seed: curriculumResult.seed
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
