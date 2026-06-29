"use client";

import { useEffect, useState } from "react";
import { FileUp, Loader2, ShieldCheck } from "lucide-react";
import { getFallbackSettingsOptions, loadSettingsOptions } from "@/lib/admin-settings";
import { documentTypeOptions, gradeOptions } from "@/lib/options";
import type { Department, KnowledgeDocumentType } from "@/lib/types";

type UploadResult = {
  ok: boolean;
  message: string;
  fileName?: string;
  openaiFileId?: string;
  vectorStoreId?: string;
  warnings?: string[];
};

export function KnowledgeUpload() {
  const fallbackSettings = getFallbackSettingsOptions();
  const [departmentOptions, setDepartmentOptions] = useState(fallbackSettings.departmentOptions);
  const [subjectOptions, setSubjectOptions] = useState<string[]>(fallbackSettings.subjectOptions);
  const [file, setFile] = useState<File | null>(null);
  const [grade, setGrade] = useState<(typeof gradeOptions)[number]>("1학년");
  const [department, setDepartment] = useState<Department>(fallbackSettings.departmentOptions[0]?.value || "materials");
  const [subjectName, setSubjectName] = useState("");
  const [unitTitle, setUnitTitle] = useState("");
  const [documentType, setDocumentType] = useState<KnowledgeDocumentType>("learning_goal");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const settings = await loadSettingsOptions();
      if (!isMounted) return;

      setDepartmentOptions(settings.departmentOptions);
      setSubjectOptions(settings.subjectOptions);
      setDepartment((current) => {
        if (settings.departmentOptions.some((option) => option.value === current)) return current;
        return settings.departmentOptions[0]?.value || current;
      });
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function uploadKnowledgeFile() {
    if (!file) return;
    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("grade", grade);
    formData.append("department", department);
    formData.append("subjectName", subjectName);
    formData.append("unitTitle", unitTitle);
    formData.append("documentType", documentType);

    try {
      const response = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as UploadResult;
      setResult(data);
    } catch {
      setResult({
        ok: false,
        message: "파일 업로드 중 오류가 발생했습니다.",
        warnings: ["네트워크 상태 또는 서버 환경변수를 확인하세요."]
      });
    } finally {
      setIsUploading(false);
    }
  }

  const canUpload = Boolean(file && subjectName.trim());

  return (
    <div className="min-w-0 space-y-5">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-blue-700">RAG 지식베이스</p>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950">문서 업로드</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          교과서 학습목표, 학과별 교육과정, NCS 능력단위, 평가 루브릭을 과목/학년/학과/단원 태그와 함께 저장합니다.
          세특과 행동특성 생성 시 관련 문서를 검색해 근거로 사용합니다.
        </p>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <section className="panel min-w-0 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="field-label">파일</span>
              <input
                className="input-base"
                type="file"
                accept=".pdf,.docx,.txt,.csv,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <span className="field-help">지원 형식: PDF, DOCX, TXT, CSV</span>
            </label>

            <label className="space-y-2">
              <span className="field-label">문서 유형</span>
              <select className="input-base" value={documentType} onChange={(event) => setDocumentType(event.target.value as KnowledgeDocumentType)}>
                {documentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="field-label">학년</span>
              <select className="input-base" value={grade} onChange={(event) => setGrade(event.target.value as typeof grade)}>
                {gradeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="field-label">학과</span>
              <select className="input-base" value={department} onChange={(event) => setDepartment(event.target.value as Department)}>
                {departmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="field-label">과목</span>
              <input
                className="input-base"
                list="knowledge-subject-options"
                placeholder="예: PLC제어"
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
              />
              <datalist id="knowledge-subject-options">
                {subjectOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="field-label">단원 태그</span>
              <input
                className="input-base"
                placeholder="예: 센서 입력과 PLC 기본 명령어"
                value={unitTitle}
                onChange={(event) => setUnitTitle(event.target.value)}
              />
            </label>
          </div>

          <button className="primary-button mt-5 w-full sm:w-auto" type="button" disabled={!canUpload || isUploading} onClick={uploadKnowledgeFile}>
            {isUploading ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <FileUp size={18} aria-hidden="true" />}
            파일 업로드 및 인덱싱
          </button>
        </section>

        <aside className="panel min-w-0 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950">보안 구조</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                파일은 서버 API Route를 통해서만 Supabase와 OpenAI에 전달되며, API 키는 클라이언트에 노출되지 않습니다.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            업로드 후 Vector Store 인덱싱에는 시간이 걸릴 수 있습니다. 생성 화면에서 검색 결과가 없으면 잠시 후 다시 시도하세요.
          </div>

          {result ? (
            <div className={`mt-4 rounded-md border p-3 ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <p className={`text-sm font-bold ${result.ok ? "text-emerald-900" : "text-amber-900"}`}>{result.message}</p>
              {result.fileName ? <p className="mt-2 text-xs text-slate-600">파일: {result.fileName}</p> : null}
              {result.openaiFileId ? <p className="mt-1 text-xs text-slate-600">OpenAI file: {result.openaiFileId}</p> : null}
              {result.vectorStoreId ? <p className="mt-1 text-xs text-slate-600">Vector store: {result.vectorStoreId}</p> : null}
              {result.warnings && result.warnings.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-700">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
