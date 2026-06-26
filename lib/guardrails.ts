import type { RecordFormPayload } from "@/lib/types";

const forbiddenPhrases = ["최고", "압도적", "탁월한 재능", "반드시 성공", "타 학생보다", "항상 완벽"];

export function validatePayload(payload: RecordFormPayload) {
  const warnings: string[] = [];

  if (!payload.grade) warnings.push("학년을 선택하세요.");

  if (payload.mode === "subject") {
    if (!payload.subjectName.trim()) warnings.push("과목명을 입력하거나 선택하세요.");
    if (payload.activityTypes.length === 0) warnings.push("활동 유형을 1개 이상 선택하세요.");
    if (payload.competencies.length === 0) {
      warnings.push("세특 생성을 위해 역량을 1개 이상 선택하세요.");
    }
    if (payload.observationMemo.trim().length < 10) {
      warnings.push("교사 관찰 메모를 10자 이상 입력하세요.");
    }

    const vagueMemo = ["성실함", "잘함", "열심히 함", "태도가 좋음"].includes(payload.observationMemo.trim());
    if (vagueMemo) {
      warnings.push("관찰 메모가 추상적입니다. 실제 행동과 상황을 더 구체적으로 입력하세요.");
    }

    return warnings;
  }

  if (!payload.className.trim()) warnings.push("학급을 입력하세요.");
  if (payload.schoolLifeAreas.length === 0) warnings.push("학교생활 영역을 1개 이상 선택하세요.");
  if (payload.industrialAttitudes.length === 0) warnings.push("공업계 특화 생활태도를 1개 이상 선택하세요.");
  if (payload.homeroomMemo.trim().length < 10) {
    warnings.push("담임 관찰 메모를 10자 이상 입력하세요.");
  }

  const vagueMemo = ["성실함", "잘함", "열심히 함", "태도가 좋음"].includes(payload.homeroomMemo.trim());
  if (vagueMemo) {
    warnings.push("담임 관찰 메모가 추상적입니다. 실제 행동과 상황을 더 구체적으로 입력하세요.");
  }

  return warnings;
}

export function collectEvidence(payload: RecordFormPayload) {
  if (payload.mode === "behavior") {
    return [
      `학생: ${payload.studentName || "입력 없음"}`,
      `학년: ${payload.grade}`,
      `학급: ${payload.className}`,
      `학교생활 영역: ${payload.schoolLifeAreas.join(", ") || "입력 없음"}`,
      `공업계 특화 생활태도: ${payload.industrialAttitudes.join(", ") || "입력 없음"}`,
      `보완할 점: ${payload.behaviorImprovements.join(", ") || "입력 없음"}`,
      `분량: ${payload.lengthOption}`,
      `담임 관찰 메모: ${payload.homeroomMemo}`
    ];
  }

  return [
    `학생: ${payload.studentName || "입력 없음"}`,
    `학년: ${payload.grade}`,
    `과목명: ${payload.subjectName}`,
    `교과서: ${payload.textbook || "입력 없음"}`,
    `단원: ${payload.unit || "입력 없음"}`,
    payload.lengthOption ? `분량: ${payload.lengthOption}` : "",
    payload.writingStyle ? `문체: ${payload.writingStyle}` : "",
    `활동 유형: ${payload.activityTypes.join(", ") || "입력 없음"}`,
    `역량: ${payload.competencies.join(", ") || "입력 없음"}`,
    `보완점: ${payload.improvements.join(", ") || "입력 없음"}`,
    `관찰 메모: ${payload.observationMemo}`
  ].filter(Boolean);
}

export function inspectDraft(draft: string) {
  return forbiddenPhrases.filter((phrase) => draft.includes(phrase)).map((phrase) => `과장 표현 가능성: ${phrase}`);
}
