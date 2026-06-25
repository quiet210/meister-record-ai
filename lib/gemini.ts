import type { GenerateResponse, RecordFormPayload } from "@/lib/types";
import { collectEvidence, inspectDraft, validatePayload } from "@/lib/guardrails";

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
};

type GeminiCallResult =
  | {
      ok: true;
      data: GeminiGenerateResponse;
      model: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
      model: string;
    };

type CurriculumPromptStandard = {
  unitName: string;
  achievementStandard: string;
  keywords: string;
};

type GeminiPromptOptions = {
  curriculumStandards?: CurriculumPromptStandard[];
};

const fallbackGeminiModel = "gemini-2.5-flash";
const maxGenerationAttempts = 2;
const minDraftChars = 250;
const maxDraftChars = 700;
const maxCurriculumPromptStandards = 5;

function buildSystemInstruction() {
  return [
    "당신은 대한민국 공업계 고등학교 교사의 학생부 작성 보조자다.",
    "학생부 세부능력 및 특기사항과 행동특성 및 종합의견 문체에 맞는 절제된 공식 문장만 작성한다.",
    "반드시 교사가 입력한 관찰 메모, 선택 항목, 명시된 학년/학급/학과 정보 안에서만 작성한다.",
    "입력 근거에 없는 활동, 성취, 결과, 수상, 자격증, 외부활동, 성격 단정, 미래 예측, 비교 우위는 절대 생성하지 않는다.",
    "최고, 매우 뛰어남, 탁월함, 압도적, 항상, 완벽 등 과장 표현과 단정 표현을 피한다.",
    "관찰 가능한 행동, 수행 과정, 태도, 개선 노력만 학생부 문체로 작성한다.",
    "학생 이름은 쓰지 않는다.",
    "제목, 목록, 해설, 근거 설명, 따옴표, 마크다운을 출력하지 않는다.",
    "초안은 반드시 250자 이상 700자 이하의 한 문단으로 작성한다.",
    "모든 문장은 완결된 문장이어야 하며, 마지막 글자는 반드시 마침표(.)여야 한다.",
    "근거가 부족하면 초안을 만들지 말고 정확히 '근거 부족: 관찰 메모를 더 구체적으로 입력하세요.'라고만 출력한다."
  ].join("\n");
}

function lengthInstruction(payload: RecordFormPayload) {
  if (payload.mode === "subject") {
    return "250자 이상 700자 이하, 2~4개의 완결된 문장으로 작성하라.";
  }

  if (payload.lengthOption === "short") {
    return "250자 이상 350자 이하, 2~3개의 완결된 문장으로 작성하라.";
  }

  if (payload.lengthOption === "long") {
    return "500자 이상 700자 이하, 3~4개의 완결된 문장으로 작성하라.";
  }

  return "350자 이상 500자 이하, 2~4개의 완결된 문장으로 작성하라.";
}

function buildCurriculumStandardsSection(standards: CurriculumPromptStandard[] = []) {
  const selectedStandards = standards
    .filter((standard) => standard.achievementStandard.trim())
    .slice(0, maxCurriculumPromptStandards);

  if (selectedStandards.length === 0) return "";

  const standardBlocks = selectedStandards.map((standard, index) =>
    [
      `${index + 1}.`,
      "[성취기준]",
      standard.achievementStandard,
      "[단원]",
      standard.unitName || "입력 없음",
      "[핵심키워드]",
      standard.keywords || "입력 없음"
    ].join("\n")
  );

  return [
    "다음은 해당 과목의 성취기준이다.",
    "반드시 아래 내용을 참고하여",
    "학생의 활동을 해당 과목의 특성에 맞게 작성하라.",
    "단, 성취기준 문장을 그대로 복사하거나 나열하지 말고 교사 관찰 메모의 실제 활동과 연결해 자연스럽게 반영하라.",
    "",
    ...standardBlocks
  ].join("\n");
}

function buildSubjectPrompt(payload: Extract<RecordFormPayload, { mode: "subject" }>, retryInstruction?: string, options?: GeminiPromptOptions) {
  const lines = [
    "세부능력 및 특기사항 초안을 작성하라.",
    "과목 수행, 단원 활동, 실습 과정, 역량, 문제 해결 과정을 중심으로 작성한다.",
    lengthInstruction(payload),
    "아래 입력 근거에 없는 활동, 성취, 태도, 평가 결과는 절대 추가하지 않는다.",
    "보완점은 낙인 표현이 아니라 지도와 개선 가능성 중심으로 절제하여 표현한다.",
    "",
    "[출력 형식]",
    "완성된 세부능력 및 특기사항 문장만 한 문단으로 출력한다.",
    "제목, 번호, 불릿, 설명, 작성 의도, 근거 목록을 출력하지 않는다.",
    "문장은 학생부 문체로 '~함.', '~보임.', '~노력함.', '~확인함.'처럼 종결한다.",
    "학생 이름을 쓰지 않는다.",
    "세특 문장은 반드시 완결된 문장으로 끝나야 하며, 마지막 글자는 마침표(.)여야 한다.",
    "출력 중간에서 끊긴 문장, 조사나 연결어로 끝나는 문장, 미완성 문장을 절대 반환하지 않는다.",
    "",
    "[입력 근거]",
    `학년: ${payload.grade}`,
    `학과: ${payload.department}`,
    `과목명: ${payload.subjectName}`,
    `교과서: ${payload.textbook || "입력 없음"}`,
    `단원: ${payload.unit || "입력 없음"}`,
    `활동 유형: ${payload.activityTypes.join(", ") || "입력 없음"}`,
    `역량: ${payload.competencies.join(", ") || "입력 없음"}`,
    `보완점: ${payload.improvements.join(", ") || "입력 없음"}`,
    `교사 관찰 메모: ${payload.observationMemo}`
  ];

  const curriculumStandardsSection = buildCurriculumStandardsSection(options?.curriculumStandards);
  if (curriculumStandardsSection) {
    lines.push("", curriculumStandardsSection);
  }

  if (retryInstruction) {
    lines.push("", retryInstruction);
  }

  return lines.join("\n");
}

function buildBehaviorPrompt(payload: Extract<RecordFormPayload, { mode: "behavior" }>, retryInstruction?: string) {
  return [
    "행동특성 및 종합의견 초안을 작성하라.",
    "특정 교과 세부활동, 교과서, 단원, 평가 루브릭 중심 표현은 넣지 않는다.",
    "학생의 학교생활 전반, 학급생활, 교우관계, 책임감, 성실성, 진로태도, 공업계 학생으로서의 안전의식과 직업윤리를 중심으로 작성한다.",
    "담임 관찰 메모와 선택된 생활 영역 안에서 확인 가능한 내용만 사용한다.",
    lengthInstruction(payload),
    "아래 입력 근거에 없는 활동, 성취, 태도, 평가 결과는 절대 추가하지 않는다.",
    "보완할 점은 낙인 표현이 아니라 지도와 개선 가능성 중심으로 절제하여 표현한다.",
    "",
    "[출력 형식]",
    "완성된 행동특성 및 종합의견 문장만 한 문단으로 출력한다.",
    "제목, 번호, 불릿, 설명, 작성 의도, 근거 목록을 출력하지 않는다.",
    "문장은 학생부 문체로 '~함.', '~보임.', '~노력함.', '~기대됨.'처럼 종결하되 미래 단정은 피한다.",
    "학생 이름을 쓰지 않는다.",
    "모든 문장은 반드시 완결된 문장으로 끝나야 하며, 마지막 글자는 마침표(.)여야 한다.",
    "출력 중간에서 끊긴 문장, 조사나 연결어로 끝나는 문장, 미완성 문장을 절대 반환하지 않는다.",
    "",
    "[입력 근거]",
    `학생: ${payload.studentName || "입력 없음"}`,
    `학년: ${payload.grade}`,
    `학급: ${payload.className}`,
    `학교생활 영역: ${payload.schoolLifeAreas.join(", ") || "입력 없음"}`,
    `공업계 특화 생활태도: ${payload.industrialAttitudes.join(", ") || "입력 없음"}`,
    `보완할 점: ${payload.behaviorImprovements.join(", ") || "입력 없음"}`,
    `담임 관찰 메모: ${payload.homeroomMemo}`,
    retryInstruction ? `\n${retryInstruction}` : ""
  ].join("\n");
}

function buildPrompt(payload: RecordFormPayload, retryInstruction?: string, options?: GeminiPromptOptions) {
  return payload.mode === "subject" ? buildSubjectPrompt(payload, retryInstruction, options) : buildBehaviorPrompt(payload, retryInstruction);
}

function extractGeminiText(data: GeminiGenerateResponse) {
  const candidates = data.candidates || [];
  const firstCandidateText =
    candidates[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";

  if (firstCandidateText) {
    return firstCandidateText;
  }

  return candidates
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
}

function finishReasons(data: GeminiGenerateResponse) {
  return (data.candidates || []).map((candidate) => candidate.finishReason || "UNKNOWN");
}

function parsedTextDiagnostics(data: GeminiGenerateResponse) {
  const candidates = data.candidates || [];
  return candidates.map((candidate, candidateIndex) => {
    const parts = candidate.content?.parts || [];
    const text = parts.map((part) => part.text || "").join("");
    return {
      candidateIndex,
      finishReason: candidate.finishReason || "UNKNOWN",
      partCount: parts.length,
      textLength: Array.from(text.trim()).length
    };
  });
}

function validateDraftCompletion(draft: string) {
  const normalized = draft.trim();
  const charLength = Array.from(normalized).length;
  const reasons: string[] = [];

  if (charLength < minDraftChars) {
    reasons.push(`250자 미만(${charLength}자)`);
  }

  if (charLength > maxDraftChars) {
    reasons.push(`700자 초과(${charLength}자)`);
  }

  if (!normalized.endsWith(".")) {
    reasons.push("마침표(.)로 종료되지 않음");
  }

  return {
    ok: reasons.length === 0,
    charLength,
    reasons
  };
}

function buildRetryInstruction(reasons: string[]) {
  return [
    "",
    "[재생성 지시]",
    `직전 응답이 다음 조건을 만족하지 못했다: ${reasons.join(", ")}`,
    "반드시 250자 이상 700자 이하의 한 문단으로 다시 작성한다.",
    "마지막 글자는 반드시 마침표(.)여야 한다.",
    "중간에서 끊긴 문장, 제목, 목록, 해설, 근거 목록은 출력하지 않는다."
  ].join("\n");
}

async function callGeminiModel(
  apiKey: string,
  model: string,
  payload: RecordFormPayload,
  routeName: string,
  attempt: number,
  retryInstruction?: string,
  options?: GeminiPromptOptions
): Promise<GeminiCallResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemInstruction() }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: buildPrompt(payload, retryInstruction, options) }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 4096
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(
      "[Gemini API error response]",
      JSON.stringify(
        {
          routeName,
          model,
          attempt,
          status: response.status,
          body: errorText
        },
        null,
        2
      )
    );

    return {
      ok: false,
      status: response.status,
      message: errorText.slice(0, 240),
      model
    };
  }

  const data = (await response.json()) as GeminiGenerateResponse;
  console.log(
    "[Gemini API raw response]",
    JSON.stringify(
      {
        routeName,
        model,
        attempt,
        response: data
      },
      null,
      2
    )
  );
  console.log(
    "[Gemini finishReason]",
    JSON.stringify(
      {
        routeName,
        model,
        attempt,
        finishReasons: finishReasons(data)
      },
      null,
      2
    )
  );
  console.log(
    "[Gemini parsed text diagnostics]",
    JSON.stringify(
      {
        routeName,
        model,
        attempt,
        candidates: parsedTextDiagnostics(data)
      },
      null,
      2
    )
  );

  return {
    ok: true,
    data,
    model
  };
}

async function generateCompleteDraftWithModel(apiKey: string, model: string, payload: RecordFormPayload, routeName: string, options?: GeminiPromptOptions) {
  const warnings: string[] = [];
  let retryInstruction: string | undefined;
  let lastValidationReasons: string[] = [];

  for (let attempt = 1; attempt <= maxGenerationAttempts; attempt += 1) {
    const result = await callGeminiModel(apiKey, model, payload, routeName, attempt, retryInstruction, options);

    if (!result.ok) {
      return {
        ok: false as const,
        failureType: "api" as const,
        model,
        status: result.status,
        message: result.message,
        warnings
      };
    }

    const draft = extractGeminiText(result.data);
    const blockReason = result.data.promptFeedback?.blockReason;

    if (!draft) {
      return {
        ok: false as const,
        failureType: "empty" as const,
        model,
        message: blockReason ? `Gemini 응답이 차단되었습니다: ${blockReason}` : "Gemini 응답에서 초안 텍스트를 찾지 못했습니다.",
        warnings
      };
    }

    const validation = validateDraftCompletion(draft);
    console.log(
      "[Gemini draft validation]",
      JSON.stringify(
        {
          routeName,
          model,
          attempt,
          charLength: validation.charLength,
          complete: validation.ok,
          reasons: validation.reasons
        },
        null,
        2
      )
    );

    if (validation.ok) {
      return {
        ok: true as const,
        model,
        draft,
        warnings
      };
    }

    lastValidationReasons = validation.reasons;
    warnings.push(`${model} ${attempt}차 응답 재생성 필요: ${validation.reasons.join(", ")}`);
    retryInstruction = buildRetryInstruction(validation.reasons);
  }

  return {
    ok: false as const,
    failureType: "invalid" as const,
    model,
    message: `Gemini가 ${maxGenerationAttempts}회 시도 후에도 완결된 250~700자 문장을 반환하지 않았습니다: ${lastValidationReasons.join(", ")}`,
    warnings
  };
}

export async function generateStudentRecordDraftWithGemini(
  payload: RecordFormPayload,
  routeName: string = payload.mode,
  options?: GeminiPromptOptions
): Promise<GenerateResponse> {
  const validationWarnings = validatePayload(payload);
  if (validationWarnings.length > 0) {
    return {
      draft: "",
      evidence: collectEvidence(payload),
      warnings: validationWarnings
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      draft: "",
      evidence: collectEvidence(payload),
      warnings: ["GEMINI_API_KEY가 설정되지 않았습니다. .env.local 또는 Vercel 환경변수에 추가하세요."]
    };
  }

  const requestedModel = process.env.GEMINI_MODEL || fallbackGeminiModel;
  const primaryResult = await generateCompleteDraftWithModel(apiKey, requestedModel, payload, routeName, options);
  const fallbackRequired =
    !primaryResult.ok && primaryResult.failureType === "api" && primaryResult.status === 503 && requestedModel !== fallbackGeminiModel;
  const result = fallbackRequired ? await generateCompleteDraftWithModel(apiKey, fallbackGeminiModel, payload, routeName, options) : primaryResult;
  const fallbackWarning = fallbackRequired
    ? [`${requestedModel} 모델이 일시적으로 사용할 수 없어 ${fallbackGeminiModel}로 재시도했습니다.`]
    : [];

  if (!result.ok) {
    const failedModels = fallbackRequired ? `${requestedModel}, ${fallbackGeminiModel}` : result.model;
    return {
      draft: "",
      evidence: collectEvidence(payload),
      warnings: [
        ...fallbackWarning,
        ...result.warnings,
        result.failureType === "api"
          ? `Gemini API 호출 실패: ${failedModels} 모델에서 초안을 생성하지 못했습니다.`
          : `Gemini 응답 검증 실패: ${failedModels} 모델에서 완결된 초안을 생성하지 못했습니다.`,
        result.failureType === "api" && result.status ? `상태 코드 ${result.status}: ${result.message}` : result.message,
        "잠시 후 다시 시도하거나 관찰 메모를 더 구체적으로 입력해 주세요."
      ]
    };
  }

  return {
    draft: result.draft,
    evidence: collectEvidence(payload),
    warnings: [...fallbackWarning, ...result.warnings, ...inspectDraft(result.draft)]
  };
}
