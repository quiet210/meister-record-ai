import { getSchoolId, createSupabaseServiceClient } from "@/lib/supabase-server";
import type { RagSource, RecordFormPayload } from "@/lib/types";

const openaiBaseUrl = "https://api.openai.com/v1";
const allowedExtensions = [".pdf", ".docx", ".txt", ".csv"];
const allowedMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/octet-stream"
];

type OpenAIFile = {
  id: string;
  filename?: string;
};

type OpenAIVectorStore = {
  id: string;
};

type VectorSearchResult = {
  data?: Array<{
    file_id?: string;
    filename?: string;
    score?: number;
    attributes?: Record<string, string | number | boolean>;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type UploadKnowledgeInput = {
  file: File;
  grade: string;
  department: string;
  subjectName: string;
  unitTitle: string;
  documentType: string;
};

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY;
}

function configuredVectorStoreIds() {
  return (process.env.OPENAI_VECTOR_STORE_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function safeFilename(filename: string) {
  return filename.replace(/[^\w.\-가-힣]/g, "_");
}

function fileExtension(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export function validateKnowledgeFile(file: File) {
  const warnings: string[] = [];
  const extension = fileExtension(file.name);
  if (!allowedExtensions.includes(extension)) {
    warnings.push("지원하지 않는 파일 확장자입니다. PDF, DOCX, TXT, CSV만 업로드할 수 있습니다.");
  }

  if (file.type && !allowedMimeTypes.includes(file.type)) {
    warnings.push(`지원하지 않는 MIME 형식입니다: ${file.type}`);
  }

  if (file.size > 25 * 1024 * 1024) {
    warnings.push("MVP 업로드 파일 크기는 25MB 이하로 제한합니다.");
  }

  return warnings;
}

async function openaiJson<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const response = await fetch(`${openaiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API 오류: ${response.status} ${message.slice(0, 240)}`);
  }

  return (await response.json()) as T;
}

async function uploadOpenAIFile(file: File): Promise<OpenAIFile> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const formData = new FormData();
  const buffer = await file.arrayBuffer();
  formData.append("file", new File([buffer], file.name, { type: file.type || "application/octet-stream" }));
  formData.append("purpose", "assistants");

  const response = await fetch(`${openaiBaseUrl}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI 파일 업로드 실패: ${response.status} ${message.slice(0, 240)}`);
  }

  return (await response.json()) as OpenAIFile;
}

async function ensureVectorStore() {
  const configured = configuredVectorStoreIds()[0];
  if (configured) {
    return configured;
  }

  const created = await openaiJson<OpenAIVectorStore>("/vector_stores", {
    method: "POST",
    body: JSON.stringify({
      name: `${getSchoolId()}-student-record-knowledge`
    })
  });

  return created.id;
}

async function attachFileToVectorStore(vectorStoreId: string, fileId: string, attributes: Record<string, string>) {
  await openaiJson(`/vector_stores/${vectorStoreId}/files`, {
    method: "POST",
    body: JSON.stringify({ file_id: fileId })
  });

  await openaiJson(`/vector_stores/${vectorStoreId}/files/${fileId}`, {
    method: "POST",
    body: JSON.stringify({ attributes })
  });
}

async function uploadToSupabaseStorage(input: UploadKnowledgeInput, storagePath: string) {
  const supabase = createSupabaseServiceClient();
  const warnings: string[] = [];
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "knowledge-files";

  if (!supabase) {
    return {
      bucket,
      storagePath,
      warnings: ["Supabase 서버 키가 없어 원본 파일과 메타데이터는 저장하지 않고 OpenAI 인덱싱만 수행했습니다."]
    };
  }

  const { error: schoolError } = await supabase.from("schools").upsert({
    id: getSchoolId(),
    name: "Demo school"
  });
  if (schoolError) {
    warnings.push(`schools upsert 실패: ${schoolError.message}`);
  }

  const { error: storageError } = await supabase.storage.from(bucket).upload(storagePath, input.file, {
    contentType: input.file.type || undefined,
    upsert: false
  });

  if (storageError) {
    warnings.push(`Supabase Storage 저장 실패: ${storageError.message}`);
  }

  return { bucket, storagePath, warnings };
}

async function insertKnowledgeMetadata(input: UploadKnowledgeInput, metadata: {
  bucket: string;
  storagePath: string;
  openaiFileId: string;
  vectorStoreId: string;
}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return ["Supabase 메타데이터 저장을 건너뛰었습니다."];

  const { error } = await supabase.from("knowledge_files").insert({
    school_id: getSchoolId(),
    original_filename: input.file.name,
    storage_bucket: metadata.bucket,
    storage_path: metadata.storagePath,
    mime_type: input.file.type || null,
    file_size: input.file.size,
    document_type: input.documentType,
    grade: input.grade,
    department: input.department,
    subject_name: input.subjectName,
    unit_title: input.unitTitle || null,
    openai_file_id: metadata.openaiFileId,
    openai_vector_store_id: metadata.vectorStoreId,
    vector_status: "uploaded"
  });

  return error ? [`Supabase 메타데이터 저장 실패: ${error.message}`] : [];
}

export async function uploadKnowledgeDocument(input: UploadKnowledgeInput) {
  const validationWarnings = validateKnowledgeFile(input.file);
  if (validationWarnings.length > 0) {
    return {
      ok: false,
      message: "파일 검증에 실패했습니다.",
      warnings: validationWarnings
    };
  }

  const storagePath = `${getSchoolId()}/${Date.now()}-${safeFilename(input.file.name)}`;
  const storageResult = await uploadToSupabaseStorage(input, storagePath);
  const openaiFile = await uploadOpenAIFile(input.file);
  const vectorStoreId = await ensureVectorStore();
  const attributes = {
    school_id: getSchoolId(),
    grade: input.grade,
    department: input.department,
    subject_name: input.subjectName,
    unit_title: input.unitTitle || "",
    document_type: input.documentType,
    original_filename: input.file.name
  };

  await attachFileToVectorStore(vectorStoreId, openaiFile.id, attributes);
  const metadataWarnings = await insertKnowledgeMetadata(input, {
    bucket: storageResult.bucket,
    storagePath: storageResult.storagePath,
    openaiFileId: openaiFile.id,
    vectorStoreId
  });

  return {
    ok: true,
    message: "파일을 업로드하고 Vector Store에 연결했습니다.",
    fileName: input.file.name,
    openaiFileId: openaiFile.id,
    vectorStoreId,
    warnings: [...storageResult.warnings, ...metadataWarnings]
  };
}

function buildSearchQuery(payload: RecordFormPayload) {
  if (payload.mode === "behavior") {
    return [
      "공업계 고등학교 행동특성 및 종합의견 작성 근거 문서 검색",
      `학년: ${payload.grade}`,
      `학급: ${payload.className}`,
      `학교생활 영역: ${payload.schoolLifeAreas.join(", ")}`,
      `공업계 특화 생활태도: ${payload.industrialAttitudes.join(", ")}`,
      `보완할 점: ${payload.behaviorImprovements.join(", ")}`,
      `담임 관찰 메모: ${payload.homeroomMemo}`,
      "학교생활 전반, 안전의식, 직업윤리, 진로태도와 관련된 근거를 찾는다."
    ].join("\n");
  }

  return [
    "공업계 고등학교 학생부 작성 근거 문서 검색",
    `과목: ${payload.subjectName}`,
    `교과서: ${payload.textbook || ""}`,
    `단원: ${payload.unit || ""}`,
    `활동 유형: ${payload.activityTypes.join(", ")}`,
    `역량: ${payload.competencies.join(", ")}`,
    `보완점: ${payload.improvements.join(", ")}`,
    `교사 관찰 메모: ${payload.observationMemo}`,
    "교과서 학습목표, 학과별 교육과정, NCS 능력단위, 평가 루브릭과 관련된 근거를 찾는다."
  ].join("\n");
}

function buildFilter(payload: RecordFormPayload) {
  return {
    type: "and",
    filters: [
      { key: "school_id", type: "eq", value: getSchoolId() },
      { key: "department", type: "eq", value: payload.department },
      { key: "grade", type: "eq", value: payload.grade }
    ]
  };
}

async function getVectorStoreIdsFromSupabase(payload: RecordFormPayload) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("knowledge_files")
    .select("openai_vector_store_id")
    .eq("school_id", getSchoolId())
    .eq("department", payload.department)
    .eq("grade", payload.grade)
    .limit(20);

  if (error || !data) return [];
  return [...new Set(data.map((row) => row.openai_vector_store_id).filter(Boolean))];
}

export async function searchKnowledgeDocuments(payload: RecordFormPayload) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return {
      sources: [] as RagSource[],
      warnings: ["OPENAI_API_KEY가 설정되지 않아 문서 검색을 수행할 수 없습니다."]
    };
  }

  const vectorStoreIds = [...new Set([...configuredVectorStoreIds(), ...(await getVectorStoreIdsFromSupabase(payload))])];

  if (vectorStoreIds.length === 0) {
    return {
      sources: [] as RagSource[],
      warnings: ["검색할 OpenAI Vector Store가 없습니다. 문서를 업로드하거나 OPENAI_VECTOR_STORE_ID를 설정하세요."]
    };
  }

  const query = buildSearchQuery(payload);
  const filter = buildFilter(payload);
  const warnings: string[] = [];
  const sources: RagSource[] = [];

  for (const vectorStoreId of vectorStoreIds) {
    try {
      const result = await openaiJson<VectorSearchResult>(`/vector_stores/${vectorStoreId}/search`, {
        method: "POST",
        body: JSON.stringify({
          query,
          filters: filter,
          max_num_results: 6,
          ranking_options: {
            ranker: "auto",
            score_threshold: 0.15
          },
          rewrite_query: true
        })
      });

      for (const item of result.data || []) {
        const text = (item.content || [])
          .map((content) => content.text)
          .filter(Boolean)
          .join("\n")
          .slice(0, 1600);

        if (!text) continue;
        sources.push({
          fileId: item.file_id,
          filename: item.filename || "검색 문서",
          score: item.score,
          text,
          attributes: item.attributes
        });
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Vector Store 검색 중 오류가 발생했습니다.");
    }
  }

  const deduped = sources
    .filter((source, index, arr) => arr.findIndex((item) => item.filename === source.filename && item.text === source.text) === index)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 6);

  return { sources: deduped, warnings };
}

export function formatRagContext(sources: RagSource[]) {
  return sources
    .map((source, index) => {
      const score = typeof source.score === "number" ? ` / score ${source.score.toFixed(3)}` : "";
      return `[문서 ${index + 1}: ${source.filename}${score}]\n${source.text}`;
    })
    .join("\n\n");
}
