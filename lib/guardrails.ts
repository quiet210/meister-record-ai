import type { RecordFormPayload } from "@/lib/types";

const forbiddenPhrases = ["최고", "압도적", "탁월한 재능", "반드시 성공", "타 학생보다", "항상 완벽"];

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function hasSelectedValue(values: string[]) {
  return values.some((value) => value.trim().length > 0);
}

function optionalTextEvidence(label: string, value?: string) {
  const trimmed = value?.trim();
  return trimmed ? `${label}: ${trimmed}` : "";
}

function optionalListEvidence(label: string, values: string[]) {
  const selectedValues = values.map((value) => value.trim()).filter(Boolean);
  return selectedValues.length > 0 ? `${label}: ${selectedValues.join(", ")}` : "";
}

export function validatePayload(payload: RecordFormPayload) {
  const warnings: string[] = [];

  if (!payload.grade) warnings.push("학년을 선택하세요.");

  if (payload.mode === "subject") {
    if (!payload.subjectName.trim()) warnings.push("과목명을 입력하거나 선택하세요.");
    const hasGenerationInput =
      hasText(payload.observationMemo) ||
      hasSelectedValue(payload.activityTypes) ||
      hasSelectedValue(payload.competencies) ||
      hasSelectedValue(payload.improvements);

    if (!hasGenerationInput) {
      warnings.push("과세특 생성을 위해 교사 관찰 메모, 활동유형, 역량키워드, 보완점 중 하나 이상 입력하세요.");
    }

    return warnings;
  }

  if (!payload.className.trim()) warnings.push("학급을 입력하세요.");
  const hasGenerationInput =
    hasText(payload.homeroomMemo) ||
    hasSelectedValue(payload.schoolLifeAreas) ||
    hasSelectedValue(payload.industrialAttitudes) ||
    hasSelectedValue(payload.behaviorImprovements);

  if (!hasGenerationInput) {
    warnings.push("행특 생성을 위해 담임 관찰 메모, 학교생활 영역, 생활태도/협업/책임감 키워드, 보완점 중 하나 이상 입력하세요.");
  }

  return warnings;
}

export function collectEvidence(payload: RecordFormPayload) {
  if (payload.mode === "behavior") {
    return [
      `학생: ${payload.studentName || "입력 없음"}`,
      `학년: ${payload.grade}`,
      `학급: ${payload.className}`,
      optionalListEvidence("학교생활 영역", payload.schoolLifeAreas),
      optionalListEvidence("공업계 특화 생활태도", payload.industrialAttitudes),
      optionalListEvidence("보완할 점", payload.behaviorImprovements),
      payload.lengthOption ? `분량: ${payload.lengthOption}` : "",
      payload.writingStyle ? `문체: ${payload.writingStyle}` : "",
      payload.writingPerspective ? `작성 관점: ${payload.writingPerspective}` : "",
      optionalTextEvidence("담임 관찰 메모", payload.homeroomMemo)
    ].filter(Boolean);
  }

  return [
    `학생: ${payload.studentName || "입력 없음"}`,
    `학년: ${payload.grade}`,
    `과목명: ${payload.subjectName}`,
    optionalTextEvidence("교과서", payload.textbook),
    optionalTextEvidence("단원", payload.unit),
    payload.lengthOption ? `분량: ${payload.lengthOption}` : "",
    payload.writingStyle ? `문체: ${payload.writingStyle}` : "",
    optionalListEvidence("활동 유형", payload.activityTypes),
    optionalListEvidence("역량", payload.competencies),
    optionalListEvidence("보완점", payload.improvements),
    optionalTextEvidence("관찰 메모", payload.observationMemo)
  ].filter(Boolean);
}

export function inspectDraft(draft: string) {
  return forbiddenPhrases.filter((phrase) => draft.includes(phrase)).map((phrase) => `과장 표현 가능성: ${phrase}`);
}
