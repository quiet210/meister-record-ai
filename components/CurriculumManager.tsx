"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X
} from "lucide-react";
import {
  buildCurriculumStandardInputs,
  buildCurriculumUploadSummary,
  createCurriculumStandards,
  createCurriculumSubject,
  curriculumSubjectTypeLabels,
  deleteCurriculumSubject,
  getCurrentCurriculumProfile,
  listCurriculumStandards,
  listCurriculumSubjects,
  normalizeCurriculumHeader,
  previewCurriculumUploadRows,
  updateCurriculumSubject,
  type CurriculumStandard,
  type CurriculumSubject,
  type CurriculumSubjectType,
  type CurriculumUploadPreviewRow,
  type CurriculumUploadRawRow,
  type CurriculumUploadSaveOption,
  type CurriculumUploadSummary
} from "@/lib/curriculum";
import { downloadCurriculumStandardsTemplate } from "@/lib/curriculum-template";
import type { UserProfile } from "@/lib/students";

type SubjectForm = {
  subjectName: string;
  subjectType: CurriculumSubjectType;
  description: string;
  sortOrder: string;
};

type UploadResult = {
  totalRows: number;
  savedRows: number;
  exactDuplicateRows: number;
  similarDuplicateExcludedRows: number;
  errorRows: number;
  missingSubjectRows: number;
};

type SubjectTypeFilter = CurriculumSubjectType | "all";

type StandardGroup = {
  key: string;
  label: string;
  standards: CurriculumStandard[];
};

const emptySubjectForm: SubjectForm = {
  subjectName: "",
  subjectType: "general",
  description: "",
  sortOrder: "1000"
};

const noLearningModuleLabel = "학습모듈 없음";

const uploadColumnAliases = {
  subjectName: ["과목명", "subjectname", "subject_name", "subject"],
  subjectTypeLabel: ["교과유형", "교과유형값", "subjecttype", "subject_type", "type"],
  learningModule: ["학습모듈명", "학습모듈", "모듈명", "learningmodule", "learning_module", "module"],
  unitName: ["단원명", "unitname", "unit_name", "unit", "단원"],
  achievementStandard: ["성취기준", "achievementstandard", "achievement_standard", "standard"],
  keywords: ["핵심키워드", "키워드", "keywords", "keyword"]
};

const statusMeta: Record<CurriculumUploadPreviewRow["status"], { label: string; className: string }> = {
  valid: {
    label: "정상",
    className: "bg-emerald-50 text-emerald-700"
  },
  error: {
    label: "오류",
    className: "bg-rose-50 text-rose-700"
  },
  exact_duplicate: {
    label: "정확 중복",
    className: "bg-slate-100 text-slate-700"
  },
  similar_duplicate: {
    label: "유사 중복 의심",
    className: "bg-amber-50 text-amber-700"
  },
  missing_subject: {
    label: "과목 없음",
    className: "bg-orange-50 text-orange-700"
  }
};

const standardStatusMeta: Record<CurriculumStandard["status"], { label: string; className: string }> = {
  active: {
    label: "active",
    className: "bg-emerald-50 text-emerald-700"
  },
  pending: {
    label: "pending",
    className: "bg-amber-50 text-amber-700"
  },
  rejected: {
    label: "rejected",
    className: "bg-rose-50 text-rose-700"
  }
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

function cellToString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getRowValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeCurriculumHeader);
  const entry = Object.entries(row).find(([key]) => normalizedAliases.includes(normalizeCurriculumHeader(key)));
  return entry ? cellToString(entry[1]) : "";
}

async function parseCurriculumUploadFile(file: File) {
  const { read, utils } = await import("xlsx");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const workbook =
    extension === "csv"
      ? read(await file.text(), { type: "string", raw: false })
      : read(await file.arrayBuffer(), {
          type: "array",
          cellDates: false
        });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      rows: [] as CurriculumUploadRawRow[],
      errors: ["업로드 파일에서 시트를 찾을 수 없습니다."]
    };
  }

  const rows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: "",
    raw: false
  });
  const parsedRows: CurriculumUploadRawRow[] = [];

  rows.forEach((row, index) => {
    const rawRow = {
      rowNumber: index + 2,
      subjectName: getRowValue(row, uploadColumnAliases.subjectName),
      subjectTypeLabel: getRowValue(row, uploadColumnAliases.subjectTypeLabel),
      learningModule: getRowValue(row, uploadColumnAliases.learningModule),
      unitName: getRowValue(row, uploadColumnAliases.unitName),
      achievementStandard: getRowValue(row, uploadColumnAliases.achievementStandard),
      keywords: getRowValue(row, uploadColumnAliases.keywords)
    };

    if (
      [
        rawRow.subjectName,
        rawRow.subjectTypeLabel,
        rawRow.learningModule,
        rawRow.unitName,
        rawRow.achievementStandard,
        rawRow.keywords
      ].some(Boolean)
    ) {
      parsedRows.push(rawRow);
    }
  });

  if (rows.length === 0) {
    return {
      rows: [],
      errors: ["첫 번째 시트에 데이터가 없습니다."]
    };
  }

  if (parsedRows.length === 0) {
    return {
      rows: [],
      errors: ["업로드할 성취기준 행을 찾지 못했습니다. 첫 행의 헤더를 확인하세요."]
    };
  }

  return {
    rows: parsedRows,
    errors: [] as string[]
  };
}

function summaryCards(summary: CurriculumUploadSummary | UploadResult) {
  const savedRows = "savedRows" in summary ? summary.savedRows : summary.newRows;
  const similarExcludedRows = "similarDuplicateExcludedRows" in summary ? summary.similarDuplicateExcludedRows : summary.similarDuplicateRows;

  return [
    { label: "총 행 수", value: summary.totalRows },
    { label: "신규 저장 수", value: savedRows },
    { label: "정확 중복 제외", value: summary.exactDuplicateRows },
    { label: "유사 중복 제외", value: similarExcludedRows },
    { label: "오류", value: summary.errorRows },
    { label: "과목 없음", value: summary.missingSubjectRows }
  ];
}

function subjectTypeLabel(type: CurriculumSubjectType) {
  return curriculumSubjectTypeLabels[type];
}

function learningModuleLabel(standard: CurriculumStandard) {
  return standard.learningModule.trim() || noLearningModuleLabel;
}

function learningModuleKey(standard: CurriculumStandard) {
  const moduleName = standard.learningModule.trim();
  return moduleName ? `module:${moduleName}` : "module:none";
}

function groupStandardsByLearningModule(standards: CurriculumStandard[]) {
  const groups = new Map<string, StandardGroup>();

  standards.forEach((standard) => {
    const key = learningModuleKey(standard);
    const label = learningModuleLabel(standard);
    const group = groups.get(key) || { key, label, standards: [] };
    group.standards.push(standard);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

export function CurriculumManager() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [standardCatalog, setStandardCatalog] = useState<CurriculumStandard[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<CurriculumSubject | null>(null);
  const [selectedStandards, setSelectedStandards] = useState<CurriculumStandard[]>([]);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<SubjectTypeFilter>("all");
  const [hasSubjectLookupRun, setHasSubjectLookupRun] = useState(false);
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(emptySubjectForm);
  const [editingSubject, setEditingSubject] = useState<CurriculumSubject | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<CurriculumUploadPreviewRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState<CurriculumUploadSummary | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [saveOption, setSaveOption] = useState<CurriculumUploadSaveOption>("new_only");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSubject, setIsSavingSubject] = useState(false);
  const [isLoadingStandardCatalog, setIsLoadingStandardCatalog] = useState(false);
  const [hasLoadedStandardCatalog, setHasLoadedStandardCatalog] = useState(false);
  const [isLoadingSelectedStandards, setIsLoadingSelectedStandards] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSavingUpload, setIsSavingUpload] = useState(false);
  const [expandedModuleKeys, setExpandedModuleKeys] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = profile?.role === "admin";
  const canSaveUpload = buildCurriculumStandardInputs(previewRows, saveOption).length > 0;
  const hasSubjectLookupInput = Boolean(subjectSearchQuery.trim()) || subjectTypeFilter !== "all";
  const shouldShowSubjectResults = hasSubjectLookupInput || hasSubjectLookupRun;
  const selectedStandardGroups = useMemo(() => groupStandardsByLearningModule(selectedStandards), [selectedStandards]);
  const subjectMetricsById = useMemo(() => {
    const metrics = new Map<string, { standardCount: number; learningModuleCount: number }>();
    const moduleKeysBySubject = new Map<string, Set<string>>();

    standardCatalog.forEach((standard) => {
      const current = metrics.get(standard.subjectId) || { standardCount: 0, learningModuleCount: 0 };
      const moduleKeys = moduleKeysBySubject.get(standard.subjectId) || new Set<string>();

      current.standardCount += 1;
      moduleKeys.add(learningModuleKey(standard));
      current.learningModuleCount = moduleKeys.size;
      metrics.set(standard.subjectId, current);
      moduleKeysBySubject.set(standard.subjectId, moduleKeys);
    });

    return metrics;
  }, [standardCatalog]);
  const filteredSubjects = useMemo(() => {
    if (!shouldShowSubjectResults) return [] as CurriculumSubject[];

    const normalizedQuery = subjectSearchQuery.trim().toLowerCase();
    return subjects
      .filter((subject) => subjectTypeFilter === "all" || subject.subjectType === subjectTypeFilter)
      .filter((subject) => !normalizedQuery || subject.subjectName.toLowerCase().includes(normalizedQuery));
  }, [shouldShowSubjectResults, subjectSearchQuery, subjectTypeFilter, subjects]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!hasSubjectLookupInput || hasLoadedStandardCatalog || isLoadingStandardCatalog) return;

    let isCancelled = false;

    async function loadCatalogForLookup() {
      setIsLoadingStandardCatalog(true);
      const standardResult = await listCurriculumStandards();
      if (isCancelled) return;

      if (standardResult.error) {
        setError(standardResult.error);
      } else {
        setStandardCatalog(standardResult.standards);
        setHasLoadedStandardCatalog(true);
      }
      setIsLoadingStandardCatalog(false);
    }

    void loadCatalogForLookup();

    return () => {
      isCancelled = true;
    };
  }, [hasSubjectLookupInput, hasLoadedStandardCatalog]);

  async function loadAll() {
    setIsLoading(true);
    setError("");

    try {
      const [profileResult, subjectResult] = await Promise.all([
        getCurrentCurriculumProfile(),
        listCurriculumSubjects()
      ]);

      if (profileResult.profile) setProfile(profileResult.profile);
      if (profileResult.error) setError(profileResult.error);
      setSubjects(subjectResult.subjects);

      const errors = [subjectResult.error].filter(Boolean);
      if (errors.length > 0) setError(errors.join(" "));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadStandardCatalog(options?: { force?: boolean }) {
    if (!options?.force && (hasLoadedStandardCatalog || isLoadingStandardCatalog)) return;

    setIsLoadingStandardCatalog(true);
    const standardResult = await listCurriculumStandards();

    if (standardResult.error) {
      setError(standardResult.error);
    } else {
      setStandardCatalog(standardResult.standards);
      setHasLoadedStandardCatalog(true);
    }

    setIsLoadingStandardCatalog(false);
  }

  async function refreshCurriculumData() {
    await loadAll();
    if (shouldShowSubjectResults || hasLoadedStandardCatalog) {
      await loadStandardCatalog({ force: true });
    }
    if (selectedSubject) {
      await loadSelectedSubjectStandards(selectedSubject, { preserveFeedback: true });
    }
  }

  async function runSubjectLookup() {
    setHasSubjectLookupRun(true);
    await loadStandardCatalog();
  }

  async function loadSelectedSubjectStandards(subject: CurriculumSubject, options?: { preserveFeedback?: boolean }) {
    setIsLoadingSelectedStandards(true);
    if (!options?.preserveFeedback) {
      setMessage("");
      setError("");
    }

    const standardResult = await listCurriculumStandards({ subjectName: subject.subjectName });

    if (standardResult.error) {
      setError(standardResult.error);
      setSelectedStandards([]);
      setExpandedModuleKeys([]);
    } else {
      const groups = groupStandardsByLearningModule(standardResult.standards);
      setSelectedStandards(standardResult.standards);
      setExpandedModuleKeys(groups[0] ? [groups[0].key] : []);
    }

    setIsLoadingSelectedStandards(false);
  }

  async function selectSubject(subject: CurriculumSubject) {
    setSelectedSubject(subject);
    await loadSelectedSubjectStandards(subject);
  }

  function toggleModuleGroup(groupKey: string) {
    setExpandedModuleKeys((current) => (current.includes(groupKey) ? current.filter((key) => key !== groupKey) : [...current, groupKey]));
  }

  function resetSubjectForm() {
    setSubjectForm(emptySubjectForm);
    setEditingSubject(null);
    setMessage("");
    setError("");
  }

  function startEditSubject(subject: CurriculumSubject) {
    setEditingSubject(subject);
    setSubjectForm({
      subjectName: subject.subjectName,
      subjectType: subject.subjectType,
      description: subject.description,
      sortOrder: String(subject.sortOrder)
    });
    setMessage("");
    setError("");
  }

  function updateSubjectForm<K extends keyof SubjectForm>(key: K, value: SubjectForm[K]) {
    setSubjectForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function saveSubject() {
    setIsSavingSubject(true);
    setMessage("");
    setError("");
    const editingSubjectId = editingSubject?.id;

    const input = {
      subjectName: subjectForm.subjectName,
      subjectType: subjectForm.subjectType,
      description: subjectForm.description,
      sortOrder: Number.parseInt(subjectForm.sortOrder, 10)
    };

    const result = editingSubject?.id ? await updateCurriculumSubject(editingSubject.id, input) : await createCurriculumSubject(input);

    if (result.error) {
      setError(result.error);
      setIsSavingSubject(false);
      return;
    }

    await loadAll();
    if (hasLoadedStandardCatalog) await loadStandardCatalog({ force: true });
    if (editingSubjectId && selectedSubject?.id === editingSubjectId) {
      setSelectedSubject(null);
      setSelectedStandards([]);
      setExpandedModuleKeys([]);
    }
    setSubjectForm(emptySubjectForm);
    setEditingSubject(null);
    setMessage(editingSubjectId ? "과목을 수정했습니다." : "과목을 추가했습니다.");
    setIsSavingSubject(false);
  }

  async function removeSubject(subject: CurriculumSubject) {
    setIsSavingSubject(true);
    setMessage("");
    setError("");

    const result = await deleteCurriculumSubject(subject.id);
    if (result.error) {
      setError(result.error);
      setIsSavingSubject(false);
      return;
    }

    if (editingSubject?.id === subject.id) resetSubjectForm();
    if (selectedSubject?.id === subject.id) {
      setSelectedSubject(null);
      setSelectedStandards([]);
      setExpandedModuleKeys([]);
    }
    await loadAll();
    if (hasLoadedStandardCatalog) await loadStandardCatalog({ force: true });
    setMessage(`${subject.subjectName} 과목을 삭제했습니다.`);
    setIsSavingSubject(false);
  }

  async function previewUpload() {
    if (!uploadFile) return;

    setIsPreviewing(true);
    setMessage("");
    setError("");
    setUploadResult(null);
    setPreviewRows([]);
    setPreviewSummary(null);

    try {
      const parsed = await parseCurriculumUploadFile(uploadFile);
      if (parsed.errors.length > 0) {
        setError(parsed.errors.join(" "));
        return;
      }

      const [subjectResult, standardResult] = await Promise.all([listCurriculumSubjects(), listCurriculumStandards()]);
      if (subjectResult.error || standardResult.error) {
        setError([subjectResult.error, standardResult.error].filter(Boolean).join(" "));
        return;
      }

      setSubjects(subjectResult.subjects);
      setStandardCatalog(standardResult.standards);
      setHasLoadedStandardCatalog(true);

      const preview = previewCurriculumUploadRows(parsed.rows, subjectResult.subjects, standardResult.standards);
      setPreviewRows(preview.rows);
      setPreviewSummary(preview.summary);
      setMessage(`${preview.summary.totalRows}개 행을 미리보기로 분석했습니다.`);
    } catch (previewError) {
      setError(getErrorMessage(previewError));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function saveUploadRows() {
    setIsSavingUpload(true);
    setMessage("");
    setError("");
    setUploadResult(null);

    const inputs = buildCurriculumStandardInputs(previewRows, saveOption);
    if (inputs.length === 0) {
      setError("저장할 신규 성취기준이 없습니다.");
      setIsSavingUpload(false);
      return;
    }

    const result = await createCurriculumStandards(inputs);
    if (result.error) {
      setError(result.error);
      setIsSavingUpload(false);
      return;
    }

    const summary = buildCurriculumUploadSummary(previewRows);
    const similarDuplicateExcludedRows = saveOption === "include_similar" ? 0 : summary.similarDuplicateRows;
    const nextUploadResult = {
      totalRows: summary.totalRows,
      savedRows: result.standards.length,
      exactDuplicateRows: summary.exactDuplicateRows,
      similarDuplicateExcludedRows,
      errorRows: summary.errorRows,
      missingSubjectRows: summary.missingSubjectRows
    };

    setUploadResult(nextUploadResult);
    setMessage(`${result.standards.length}개 성취기준을 저장했습니다.`);
    setPreviewRows([]);
    setPreviewSummary(null);
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (hasLoadedStandardCatalog) await loadStandardCatalog({ force: true });
    if (selectedSubject) await loadSelectedSubjectStandards(selectedSubject, { preserveFeedback: true });
    setIsSavingUpload(false);
  }

  if (isLoading) {
    return (
      <section className="panel p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-700" size={22} aria-hidden="true" />
          <div>
            <h1 className="text-lg font-bold text-slate-950">과목/성취기준 정보를 불러오는 중</h1>
            <p className="mt-1 text-sm text-slate-500">로그인 사용자와 학교 ID를 확인하고 있습니다.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="panel p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 text-amber-700" size={22} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-amber-700">로그인 필요</p>
            <h1 className="mt-1 text-xl font-bold text-slate-950">사용자 프로필을 확인하지 못했습니다.</h1>
            {error ? <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <section className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Curriculum</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">과목/성취기준 관리</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              학교 공통 과목과 과목별 성취기준을 관리합니다. 성취기준 업로드는 teacher도 가능하며 과목 추가, 수정, 삭제는 admin만 가능합니다.
            </p>
          </div>
          <button className="secondary-button w-full sm:w-auto" type="button" onClick={refreshCurriculumData} disabled={isLoading || isSavingSubject || isPreviewing || isSavingUpload}>
            <RefreshCw size={18} aria-hidden="true" />
            새로고침
          </button>
        </div>

        {message ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {isAdmin ? (
          <section className="panel p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">과목 관리</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">성취기준 업로드 전에 과목을 먼저 등록합니다.</p>
              </div>
              {editingSubject ? (
                <button className="secondary-button px-3" type="button" onClick={resetSubjectForm} disabled={isSavingSubject} aria-label="수정 취소">
                  <X size={18} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-4">
              <label className="block space-y-2">
                <span className="field-label">과목명</span>
                <input className="input-base" value={subjectForm.subjectName} onChange={(event) => updateSubjectForm("subjectName", event.target.value)} placeholder="예: PLC제어" />
              </label>
              <label className="block space-y-2">
                <span className="field-label">교과유형</span>
                <select
                  className="input-base"
                  value={subjectForm.subjectType}
                  onChange={(event) => updateSubjectForm("subjectType", event.target.value as CurriculumSubjectType)}
                >
                  <option value="general">일반교과</option>
                  <option value="ncs">NCS교과</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="field-label">설명</span>
                <textarea
                  className="input-base min-h-24 resize-y leading-6"
                  value={subjectForm.description}
                  onChange={(event) => updateSubjectForm("description", event.target.value)}
                  placeholder="선택 입력"
                />
              </label>
              <label className="block space-y-2">
                <span className="field-label">정렬순서</span>
                <input className="input-base" type="number" value={subjectForm.sortOrder} onChange={(event) => updateSubjectForm("sortOrder", event.target.value)} />
              </label>
              <button
                className="primary-button w-full"
                type="button"
                disabled={!subjectForm.subjectName.trim() || isSavingSubject}
                onClick={saveSubject}
              >
                {isSavingSubject ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : editingSubject ? <Pencil size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                {editingSubject ? "과목 수정" : "과목 추가"}
              </button>
            </div>
          </section>
        ) : (
          <section className="panel p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-amber-700" size={22} aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">과목 등록은 관리자 권한이 필요합니다.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  업로드 파일의 과목명이 목록에 없으면 저장되지 않습니다. 필요한 과목은 관리자에게 등록을 요청하세요.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="panel overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">과목 조회</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  과목을 조회하거나 선택하면 등록된 성취기준을 확인할 수 있습니다.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">등록 과목 {subjects.length}개</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
              <label className="space-y-2">
                <span className="field-label">과목명 검색</span>
                <input
                  className="input-base"
                  value={subjectSearchQuery}
                  onChange={(event) => setSubjectSearchQuery(event.target.value)}
                  placeholder="과목명"
                />
              </label>
              <label className="space-y-2">
                <span className="field-label">교과유형</span>
                <select className="input-base" value={subjectTypeFilter} onChange={(event) => setSubjectTypeFilter(event.target.value as SubjectTypeFilter)}>
                  <option value="all">전체</option>
                  <option value="general">일반교과</option>
                  <option value="ncs">NCS교과</option>
                </select>
              </label>
              <button className="primary-button self-end" type="button" onClick={runSubjectLookup} disabled={isLoadingStandardCatalog}>
                {isLoadingStandardCatalog ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
                조회
              </button>
            </div>
          </div>

          {!shouldShowSubjectResults ? (
            <div className="p-5 text-sm leading-6 text-slate-500">과목을 조회하거나 선택하면 등록된 성취기준을 확인할 수 있습니다.</div>
          ) : filteredSubjects.length === 0 ? (
            <div className="p-5 text-sm leading-6 text-slate-500">조회 조건에 맞는 과목이 없습니다.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSubjects.map((subject) => {
                const metrics = subjectMetricsById.get(subject.id) || { standardCount: 0, learningModuleCount: 0 };
                const isSelected = selectedSubject?.id === subject.id;

                return (
                  <div key={subject.id} className={`grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] ${isSelected ? "bg-blue-50/60" : "bg-white"}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{subject.subjectName}</p>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{subjectTypeLabel(subject.subjectType)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{subject.description || "설명 없음"}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:max-w-md">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <dt className="text-xs font-semibold text-slate-500">성취기준</dt>
                          <dd className="mt-1 font-bold text-slate-950">{isLoadingStandardCatalog ? "계산 중" : `${metrics.standardCount}개`}</dd>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <dt className="text-xs font-semibold text-slate-500">학습모듈</dt>
                          <dd className="mt-1 font-bold text-slate-950">{isLoadingStandardCatalog ? "계산 중" : `${metrics.learningModuleCount}개`}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <button className="secondary-button justify-center" type="button" onClick={() => selectSubject(subject)} disabled={isLoadingSelectedStandards}>
                        <Eye size={17} aria-hidden="true" />
                        보기
                      </button>
                      {isAdmin ? (
                        <>
                          <button className="secondary-button justify-center" type="button" onClick={() => startEditSubject(subject)} disabled={isSavingSubject}>
                            <Pencil size={17} aria-hidden="true" />
                            수정
                          </button>
                          <button className="secondary-button justify-center text-rose-600 hover:bg-rose-50" type="button" onClick={() => removeSubject(subject)} disabled={isSavingSubject}>
                            <Trash2 size={17} aria-hidden="true" />
                            삭제
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>

      {selectedSubject ? (
        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950">선택 과목 성취기준</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{selectedSubject.subjectName}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{subjectTypeLabel(selectedSubject.subjectType)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500 sm:text-right">
              <span>성취기준 {selectedStandards.length}개</span>
              <span>학습모듈 {selectedStandardGroups.length}개</span>
            </div>
          </div>

          {isLoadingSelectedStandards ? (
            <div className="flex items-center gap-3 p-5 text-sm font-semibold text-slate-600">
              <Loader2 className="animate-spin text-blue-700" size={18} aria-hidden="true" />
              성취기준을 불러오는 중입니다.
            </div>
          ) : selectedStandards.length === 0 ? (
            <div className="p-5 text-sm leading-6 text-slate-500">이 과목에 등록된 성취기준이 없습니다.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {selectedStandardGroups.map((group) => {
                const isExpanded = expandedModuleKeys.includes(group.key);

                return (
                  <div key={group.key}>
                    <button
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:px-5"
                      type="button"
                      onClick={() => toggleModuleGroup(group.key)}
                      aria-expanded={isExpanded}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {isExpanded ? <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-slate-500" /> : <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-slate-500" />}
                        <span className="truncate font-semibold text-slate-950">{group.label}</span>
                      </span>
                      <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{group.standards.length}개</span>
                    </button>

                    {isExpanded ? (
                      <div className="border-t border-slate-100 bg-white">
                        {group.standards.map((standard) => {
                          const meta = standardStatusMeta[standard.status];
                          return (
                            <div key={standard.id} className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:px-5 lg:grid-cols-[minmax(0,160px)_minmax(0,1fr)_minmax(0,190px)_auto]">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500">단원명</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{standard.unitName || "-"}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500">성취기준</p>
                                <p className="mt-1 text-sm leading-6 text-slate-700">{standard.achievementStandard || "-"}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500">핵심키워드</p>
                                <p className="mt-1 text-sm leading-6 text-slate-700">{standard.keywords || "-"}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500">상태</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>
                                  {standard.duplicateStatus === "similar_included" ? (
                                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">유사 포함</span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <FileSpreadsheet size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950">성취기준 일괄 업로드</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                과목명, 교과유형, 학습모듈명, 단원명, 성취기준, 핵심키워드 컬럼을 가진 xlsx, xls, csv 파일을 미리보기 후 저장합니다.
              </p>
            </div>
          </div>
          <button className="secondary-button w-full sm:w-auto" type="button" onClick={downloadCurriculumStandardsTemplate}>
            <Download size={18} aria-hidden="true" />
            성취기준 양식 다운로드
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="space-y-2">
            <span className="field-label">업로드 파일</span>
            <input
              ref={fileInputRef}
              className="input-base"
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={(event) => {
                setUploadFile(event.target.files?.[0] || null);
                setPreviewRows([]);
                setPreviewSummary(null);
                setUploadResult(null);
                setMessage("");
                setError("");
              }}
              disabled={isPreviewing || isSavingUpload}
            />
          </label>
          <button className="primary-button self-end" type="button" disabled={!uploadFile || isPreviewing || isSavingUpload} onClick={previewUpload}>
            {isPreviewing ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
            업로드 전 미리보기
          </button>
        </div>

        <fieldset className="mt-5 space-y-3">
          <legend className="field-label">저장 옵션</legend>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="flex min-h-16 cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white p-3 hover:border-blue-200">
              <input
                className="mt-1"
                type="radio"
                name="curriculum-upload-option"
                checked={saveOption === "new_only"}
                onChange={() => setSaveOption("new_only")}
              />
              <span>
                <span className="block text-sm font-bold text-slate-950">신규만 저장</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">유사 중복 의심 행은 제외합니다.</span>
              </span>
            </label>
            <label className="flex min-h-16 cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white p-3 hover:border-blue-200">
              <input
                className="mt-1"
                type="radio"
                name="curriculum-upload-option"
                checked={saveOption === "include_similar"}
                onChange={() => setSaveOption("include_similar")}
              />
              <span>
                <span className="block text-sm font-bold text-slate-950">유사 중복 포함 저장</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">정확 중복은 항상 제외됩니다.</span>
              </span>
            </label>
          </div>
        </fieldset>
      </section>

      {previewSummary ? (
        <section className="panel p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">미리보기 결과</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                정확 중복은 저장할 수 없고, 유사 중복은 선택한 저장 옵션에 따라 처리됩니다.
              </p>
            </div>
            <button className="primary-button w-full sm:w-auto" type="button" disabled={!canSaveUpload || isSavingUpload} onClick={saveUploadRows}>
              {isSavingUpload ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
              미리보기 저장
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
            {summaryCards(previewSummary).map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>

          {previewSummary.missingSubjectRows > 0 ? (
            <p className="mt-4 rounded-md bg-orange-50 p-3 text-sm font-semibold leading-6 text-orange-800">
              {isAdmin ? "과목 없음 행은 과목을 생성한 뒤 다시 미리보기/저장하세요." : "과목 없음 행은 관리자에게 과목 등록을 요청한 뒤 다시 업로드하세요."}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-[1180px] divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">행</th>
                  <th className="px-3 py-2">과목명</th>
                  <th className="px-3 py-2">교과유형</th>
                  <th className="px-3 py-2">학습모듈명</th>
                  <th className="px-3 py-2">단원명</th>
                  <th className="px-3 py-2">성취기준</th>
                  <th className="px-3 py-2">핵심키워드</th>
                  <th className="px-3 py-2">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {previewRows.map((row) => {
                  const meta = statusMeta[row.status];
                  const hasWarning = row.status === "valid" && row.messages.length > 0;
                  return (
                    <tr key={`${row.rowNumber}-${row.subjectName}-${row.learningModule}-${row.unitName}`} className="align-top">
                      <td className="px-3 py-3 text-slate-500">{row.rowNumber}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{row.subjectName || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{row.subjectType ? subjectTypeLabel(row.subjectType) : row.subjectTypeLabel || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{row.learningModule || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{row.unitName || "-"}</td>
                      <td className="max-w-md px-3 py-3 leading-6 text-slate-700">{row.achievementStandard || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{row.keywords || "-"}</td>
                      <td className="max-w-sm px-3 py-3 text-xs leading-5 text-slate-600">
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${hasWarning ? "bg-amber-50 text-amber-700" : meta.className}`}>
                          {hasWarning ? "경고" : meta.label}
                        </span>
                        <span className="mt-1 block">{row.messages.length > 0 ? row.messages.join(" ") : "저장 가능"}</span>
                        {row.similarMatches.length > 0 ? (
                          <span className="mt-1 block text-amber-700">유사 후보: {row.similarMatches[0]}</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {uploadResult ? (
        <section className="panel p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 text-emerald-700" size={22} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-950">업로드 결과</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
                {summaryCards(uploadResult).map((item) => (
                  <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
