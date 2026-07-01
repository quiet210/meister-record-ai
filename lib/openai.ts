import type { CommentMode, GenerateResponse, RecordFormPayload } from "@/lib/types";
import { formatRagContext, searchKnowledgeDocuments } from "@/lib/rag";
import { collectEvidence, inspectDraft, validatePayload } from "@/lib/guardrails";

function optionalTextLine(label: string, value?: string) {
  const trimmed = value?.trim();
  return trimmed ? `${label}: ${trimmed}` : "";
}

function optionalListLine(label: string, values: string[]) {
  const selectedValues = values.map((value) => value.trim()).filter(Boolean);
  return selectedValues.length > 0 ? `${label}: ${selectedValues.join(", ")}` : "";
}

function buildSystemPrompt() {
  return [
    "당신은 대한민국 공업계 고등학교 교사의 학생부 작성 보조자다.",
    "입력된 관찰 근거 안에서만 작성한다.",
    "교과/교육과정/NCS/루브릭 근거는 검색된 문서 내용에서만 사용한다.",
    "학생의 실제 활동과 태도는 교사 관찰 메모와 선택 또는 입력된 항목에 있는 내용만 사용한다.",
    "없는 사실, 수상, 자격증, 외부활동, 성격 단정, 미래 예측을 생성하지 않는다.",
    "과장 표현을 피하고 실제 관찰 중심으로 학생부 문체를 사용한다.",
    "검색 문서 또는 입력 근거가 부족하면 문장을 생성하지 말고 근거 부족을 알린다."
  ].join("\n");
}

function buildUserPrompt(payload: RecordFormPayload, ragContext: string) {
  if (payload.mode === "behavior") {
    return [
      "행동특성 및 종합의견 초안을 작성하라.",
      "특정 교과 세부활동, 교과서, 단원 중심 표현은 넣지 않는다.",
      "학생의 학교생활 전반, 학급생활, 교우관계, 책임감, 성실성, 진로태도, 공업계 학생으로서의 안전의식과 직업윤리를 중심으로 작성한다.",
      "1~2문장, 250자 이내로 작성하라.",
      "학생 이름은 쓰지 않는다.",
      "아래 [검색 문서 근거]와 [교사 입력 근거]에 없는 내용은 쓰지 않는다.",
      "검색 문서의 일반 교육과정 표현을 학생 개인의 성취로 과장하지 않는다.",
      "",
      "[검색 문서 근거]",
      ragContext,
      "",
      "[입력 근거]",
      `학년: ${payload.grade}`,
      `학급: ${payload.className}`,
      optionalListLine("학교생활 영역", payload.schoolLifeAreas),
      optionalListLine("공업계 특화 생활태도", payload.industrialAttitudes),
      optionalListLine("보완할 점", payload.behaviorImprovements),
      optionalTextLine("담임 관찰 메모", payload.homeroomMemo)
    ].filter(Boolean).join("\n");
  }

  return [
    "세부능력 및 특기사항 초안을 작성하라.",
    "과목 수행, 단원 활동, 실습 과정, 역량, 문제 해결 과정을 중심으로 작성한다.",
    "1~2문장, 250자 이내로 작성하라.",
    "학생 이름은 쓰지 않는다.",
    "아래 [검색 문서 근거]와 [교사 입력 근거]에 없는 내용은 쓰지 않는다.",
    "검색 문서에 있는 교육과정/학습목표/NCS/루브릭 표현을 학생 활동으로 과장하지 않는다.",
    "",
    "[검색 문서 근거]",
    ragContext,
    "",
    "[입력 근거]",
    `학년: ${payload.grade}`,
    `학과: ${payload.department}`,
    `과목명: ${payload.subjectName}`,
    optionalTextLine("교과서", payload.textbook),
    optionalTextLine("단원", payload.unit),
    optionalListLine("활동 유형", payload.activityTypes),
    optionalListLine("역량", payload.competencies),
    optionalListLine("보완점", payload.improvements),
    optionalTextLine("교사 관찰 메모", payload.observationMemo)
  ].filter(Boolean).join("\n");
}

export async function generateStudentRecordDraft(payload: RecordFormPayload): Promise<GenerateResponse> {
  const validationWarnings = validatePayload(payload);
  if (validationWarnings.length > 0) {
    return {
      draft: "",
      evidence: collectEvidence(payload),
      warnings: validationWarnings
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      draft: "",
      evidence: collectEvidence(payload),
      warnings: ["OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 API 키를 추가하세요."]
    };
  }

  const searchResult = await searchKnowledgeDocuments(payload);
  if (searchResult.sources.length === 0) {
    return {
      draft: "",
      evidence: collectEvidence(payload),
      warnings: [
        ...searchResult.warnings,
        "관련 교과서 학습목표, 교육과정, NCS 능력단위, 평가 루브릭 문서 근거를 찾지 못해 초안을 생성하지 않았습니다."
      ],
      sources: []
    };
  }

  const ragContext = formatRagContext(searchResult.sources);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: [
        {
          role: "system",
          content: buildSystemPrompt()
        },
        {
          role: "user",
          content: buildUserPrompt(payload, ragContext)
        }
      ],
      max_output_tokens: 500
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      draft: "",
      evidence: collectEvidence(payload),
      warnings: [...searchResult.warnings, `OpenAI API 호출 실패: ${response.status} ${errorText.slice(0, 180)}`],
      sources: searchResult.sources
    };
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  const draft =
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .find((content) => content.type === "output_text")?.text ||
    "";

  return {
    draft: draft.trim(),
    evidence: [
      ...collectEvidence(payload),
      ...searchResult.sources.map((source, index) => `검색 문서 ${index + 1}: ${source.filename}`)
    ],
    warnings: [...searchResult.warnings, ...inspectDraft(draft)],
    sources: searchResult.sources
  };
}
