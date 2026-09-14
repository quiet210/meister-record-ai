import { NextResponse } from "next/server";
import { logAiUsage } from "@/lib/ai-usage-server";
import { selectCurriculumStandardsForSubjectComment } from "@/lib/curriculum-server";
import { assertStudentBelongsToSchool, getGenerateApiAuthContext } from "@/lib/generate-api-auth";
import { generateStudentRecordDraftWithGemini } from "@/lib/gemini";
import type { SubjectRecordFormPayload } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await getGenerateApiAuthContext(request);
  if (authResult.response) return authResult.response;

  const body = (await request.json()) as Omit<SubjectRecordFormPayload, "mode">;
  const studentAccessError = await assertStudentBelongsToSchool(authResult.supabase, authResult.context, body.selectedStudentId);
  if (studentAccessError) return studentAccessError;

  const scopedBody = {
    ...body,
    schoolId: authResult.context.schoolId
  };
  const curriculumResult = await selectCurriculumStandardsForSubjectComment(scopedBody);
  const curriculumStandards = curriculumResult.standards;

  console.log(
    "[subject-comment curriculum standards]",
    JSON.stringify(
      {
        selectedSubject: scopedBody.subjectName,
        requestedLearningModule: curriculumResult.requestedLearningModule || scopedBody.learningModule || "",
        usedLearningModule: curriculumResult.usedLearningModule || "",
        fallbackToSubject: curriculumResult.fallbackToSubject || false,
        totalCandidateCount: curriculumResult.totalCount,
        selectedStandards: curriculumStandards.map((standard) => ({
          learningModule: standard.learningModule,
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

  const payload: SubjectRecordFormPayload = { ...scopedBody, mode: "subject" };
  try {
    const result = await generateStudentRecordDraftWithGemini(payload, "subject-comment", {
      curriculumStandards
    });

    await logAiUsage({
      context: authResult.context,
      payload,
      result,
      mode: "subject",
      studentId: payload.selectedStudentId,
      subjectName: payload.subjectName,
      requestStatus: result.draft ? "success" : "failed",
      errorCode: result.errorCode
    });

    return NextResponse.json(result);
  } catch (error) {
    await logAiUsage({
      context: authResult.context,
      payload,
      mode: "subject",
      studentId: payload.selectedStudentId,
      subjectName: payload.subjectName,
      requestStatus: "failed",
      errorCode: error instanceof Error ? error.name : "unknown"
    });

    throw error;
  }
}
