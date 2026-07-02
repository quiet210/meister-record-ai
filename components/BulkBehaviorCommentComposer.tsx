"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Download, Loader2, Play, RefreshCcw, Search, Sparkles, UsersRound } from "lucide-react";
import { getFallbackSettingsOptions, loadSettingsOptions, type ChecklistCategoryKey, type SettingsOptions } from "@/lib/admin-settings";
import { analyzeDraftSimilarity, getDraftSimilarityStatusMeta, type DraftSimilarityInput, type DraftSimilarityResult } from "@/lib/draft-quality";
import { downloadBehaviorCommentResults, type BehaviorCommentResultExportRow } from "@/lib/export-results";
import { postGenerateApi } from "@/lib/generate-api-client";
import { behaviorImprovementOptions, gradeOptions } from "@/lib/options";
import {
  finalizeRecordDraft,
  getEffectiveRecordContent,
  getRecordDraftLifecycleStatusMeta,
  saveEditedRecordDraft,
  saveRecordDraft,
  unfinalizeRecordDraft
} from "@/lib/record-drafts";
import { ensureUserProfile, listStudents } from "@/lib/students";
import type { BehaviorRecordFormPayload, CommentLength, GenerateResponse, RecordDraftLifecycleStatus, Student } from "@/lib/types";
import { BulkDraftLifecycleEditor } from "@/components/BulkDraftLifecycleEditor";

type BulkStatus = "waiting" | "queued" | "generating" | "completed" | "failed";

type StudentBehaviorInput = {
  schoolLifeAreas: string[];
  lifeAttitudeKeywords: string[];
  relationshipKeywords: string[];
  responsibilityKeywords: string[];
  behaviorImprovements: string[];
  homeroomMemo: string;
  status: BulkStatus;
  result: GenerateResponse | null;
  aiContent: string;
  editedContent: string;
  finalContent: string;
  lifecycleStatus: RecordDraftLifecycleStatus;
  lastSavedEditedContent: string;
  pendingRegeneration: GenerateResponse | null;
  showCompare: boolean;
  isSavingDraft: boolean;
  isRegenerating: boolean;
  quality: DraftSimilarityResult | null;
  error: string;
  savedMessage: string;
};

type BulkApplyInput = Pick<
  StudentBehaviorInput,
  "schoolLifeAreas" | "lifeAttitudeKeywords" | "relationshipKeywords" | "responsibilityKeywords" | "behaviorImprovements" | "homeroomMemo"
>;

const fallbackSettingsOptions = getFallbackSettingsOptions();
const concurrencyLimit = 3;

const schoolLifeAreaOptions = ["학급생활", "교우관계", "기본생활습관", "자기관리", "진로태도", "학교 행사 참여", "봉사활동", "안전의식"];

const behaviorLengthOptions: Array<{ value: CommentLength; label: string; help: string }> = [
  { value: "short", label: "짧게", help: "250~350자" },
  { value: "medium", label: "보통", help: "350~500자" },
  { value: "long", label: "자세히", help: "500~700자" }
];

const writingStyleOptions = ["학생부 기본 문체", "담임 관찰 중심", "관계와 태도 중심", "성장/개선 중심"];
const writingPerspectiveOptions = ["학교생활 전반", "생활태도 중심", "관계와 협업 중심", "책임감/성실성 중심", "성장 가능성 중심", "공업계 직업태도 중심"];

function makeInitialStudentInput(): StudentBehaviorInput {
  return {
    schoolLifeAreas: [],
    lifeAttitudeKeywords: [],
    relationshipKeywords: [],
    responsibilityKeywords: [],
    behaviorImprovements: [],
    homeroomMemo: "",
    status: "waiting",
    result: null,
    aiContent: "",
    editedContent: "",
    finalContent: "",
    lifecycleStatus: "ai_generated",
    lastSavedEditedContent: "",
    pendingRegeneration: null,
    showCompare: false,
    isSavingDraft: false,
    isRegenerating: false,
    quality: null,
    error: "",
    savedMessage: ""
  };
}

function makeInitialBulkInput(): BulkApplyInput {
  return {
    schoolLifeAreas: [],
    lifeAttitudeKeywords: [],
    relationshipKeywords: [],
    responsibilityKeywords: [],
    behaviorImprovements: [],
    homeroomMemo: ""
  };
}

function getStatusMeta(status: BulkStatus) {
  if (status === "generating") {
    return {
      label: "생성 중",
      className: "border-blue-200 bg-blue-50 text-blue-700"
    };
  }

  if (status === "completed") {
    return {
      label: "완료",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700"
    };
  }

  if (status === "failed") {
    return {
      label: "실패",
      className: "border-rose-200 bg-rose-50 text-rose-700"
    };
  }

  return {
    label: "대기",
    className: "border-slate-200 bg-slate-50 text-slate-600"
  };
}

function sortClassNames(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "ko-KR", { numeric: true }));
}

function mergeUnique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function getGroupOptions(settingsOptions: SettingsOptions, key: ChecklistCategoryKey) {
  return (
    [...settingsOptions.behaviorSchoolLifeChecklistGroups, ...settingsOptions.behaviorIndustrialChecklistGroups].find((group) => group.key === key)?.options || []
  );
}

function getStudentWarnings(input: StudentBehaviorInput) {
  return hasBehaviorGenerationInput(input) ? [] : ["담임 관찰 메모, 학교생활 영역, 생활태도/협업/책임감 키워드, 보완점 중 하나 이상"];
}

function isStudentReady(input: StudentBehaviorInput) {
  return hasBehaviorGenerationInput(input);
}

function hasBehaviorGenerationInput(input: StudentBehaviorInput) {
  return (
    input.homeroomMemo.trim().length > 0 ||
    input.schoolLifeAreas.length > 0 ||
    getSelectedIndustrialAttitudes(input).length > 0 ||
    input.behaviorImprovements.length > 0
  );
}

function getSelectedIndustrialAttitudes(input: StudentBehaviorInput) {
  return mergeUnique([...input.lifeAttitudeKeywords, ...input.relationshipKeywords, ...input.responsibilityKeywords]);
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await worker(item);
      }
    })
  );
}

type ChipSelectorProps = {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
  showLabel?: boolean;
};

function ChipSelector({ label, options, values, onChange, disabled = false, compact = false, showLabel = true }: ChipSelectorProps) {
  function toggle(option: string) {
    if (disabled) return;

    if (values.includes(option)) {
      onChange(values.filter((value) => value !== option));
      return;
    }

    onChange([...values, option]);
  }

  return (
    <fieldset className={showLabel ? "space-y-2" : ""}>
      <legend className={showLabel ? "text-xs font-bold text-slate-600" : "sr-only"}>{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggle(option)}
              className={`${compact ? "min-h-7 px-2 py-0.5" : "min-h-8 px-2.5 py-1"} rounded-md border text-xs font-semibold transition ${
                selected ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BulkBehaviorCommentComposer() {
  const [settingsOptions, setSettingsOptions] = useState<SettingsOptions>(() => fallbackSettingsOptions);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentInputs, setStudentInputs] = useState<Record<string, StudentBehaviorInput>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [qualitySelectedStudentIds, setQualitySelectedStudentIds] = useState<string[]>([]);
  const [includeFinalizedInRegeneration, setIncludeFinalizedInRegeneration] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [lengthOption, setLengthOption] = useState<CommentLength>("medium");
  const [writingStyle, setWritingStyle] = useState(writingStyleOptions[0]);
  const [writingPerspective, setWritingPerspective] = useState(writingPerspectiveOptions[0]);
  const [bulkInput, setBulkInput] = useState<BulkApplyInput>(() => makeInitialBulkInput());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      setIsLoading(true);
      setLoadError("");

      const [settings, studentResult, profileResult] = await Promise.all([loadSettingsOptions(), listStudents(), ensureUserProfile()]);
      if (!isMounted) return;

      setSettingsOptions(settings);
      setStudents(studentResult.students);
      setStudentInputs((current) => {
        const next = { ...current };
        studentResult.students.forEach((student) => {
          if (!next[student.id]) next[student.id] = makeInitialStudentInput();
        });
        return next;
      });

      const errors = [studentResult.error, profileResult.error].filter(Boolean);
      setLoadError(errors.join(" "));
      setIsLoading(false);
    }

    loadPageData();
    window.addEventListener("student-record-ai:students-changed", loadPageData);

    return () => {
      isMounted = false;
      window.removeEventListener("student-record-ai:students-changed", loadPageData);
    };
  }, []);

  const departmentOptions = settingsOptions.departmentOptions;
  const lifeAttitudeOptions = useMemo(() => getGroupOptions(settingsOptions, "behavior_life_attitude"), [settingsOptions]);
  const relationshipOptions = useMemo(
    () => mergeUnique([...getGroupOptions(settingsOptions, "behavior_collaboration"), ...getGroupOptions(settingsOptions, "behavior_leadership")]),
    [settingsOptions]
  );
  const responsibilityOptions = useMemo(() => {
    const lifeOptions = getGroupOptions(settingsOptions, "behavior_life_attitude");
    return mergeUnique([
      ...getGroupOptions(settingsOptions, "behavior_responsibility"),
      ...lifeOptions.filter((option) => ["성실성", "근태", "자기관리", "기본생활습관"].includes(option))
    ]);
  }, [settingsOptions]);
  const selectedStudentIdSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds]);
  const qualitySelectedStudentIdSet = useMemo(() => new Set(qualitySelectedStudentIds), [qualitySelectedStudentIds]);

  const classOptions = useMemo(() => {
    const classes = students.map((student) => student.className).filter(Boolean);

    return sortClassNames(Array.from(new Set(classes)));
  }, [students]);

  const filteredStudents = useMemo(
    () =>
      students
        .filter((student) => !gradeFilter || student.grade === gradeFilter)
        .filter((student) => !departmentFilter || student.department === departmentFilter)
        .filter((student) => !classFilter || student.className === classFilter),
    [classFilter, departmentFilter, gradeFilter, students]
  );

  const selectedStudents = useMemo(() => students.filter((student) => selectedStudentIdSet.has(student.id)), [selectedStudentIdSet, students]);
  const failedStudents = useMemo(
    () =>
      selectedStudents.filter((student) => {
        const input = studentInputs[student.id];
        return input?.status === "failed" && (includeFinalizedInRegeneration || input.lifecycleStatus !== "finalized");
      }),
    [includeFinalizedInRegeneration, selectedStudents, studentInputs]
  );
  const duplicateQualityStudents = useMemo(
    () =>
      selectedStudents.filter((student) => {
        const input = studentInputs[student.id];
        if (input?.quality?.status !== "duplicate") return false;
        if (!includeFinalizedInRegeneration && input.lifecycleStatus === "finalized") return false;
        return (
          getEffectiveRecordContent({
            finalContent: input.finalContent,
            editedContent: input.editedContent,
            aiContent: input.aiContent,
            draftText: input.result?.draft
          }).length > 0
        );
      }),
    [includeFinalizedInRegeneration, selectedStudents, studentInputs]
  );
  const qualityRegenerationStudents = useMemo(
    () => duplicateQualityStudents.filter((student) => qualitySelectedStudentIdSet.has(student.id)),
    [duplicateQualityStudents, qualitySelectedStudentIdSet]
  );
  const isGenerating = selectedStudents.some((student) => ["queued", "generating"].includes(studentInputs[student.id]?.status || "waiting"));
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIdSet.has(student.id));
  const readySelectedCount = selectedStudents.filter((student) => {
    const input = studentInputs[student.id] || makeInitialStudentInput();
    return input.status !== "completed" && input.lifecycleStatus !== "finalized" && isStudentReady(input);
  }).length;
  const canGenerate = readySelectedCount > 0 && !isGenerating;

  const statusCounts = selectedStudents.reduce(
    (counts, student) => {
      const status = studentInputs[student.id]?.status || "waiting";
      counts[status] += 1;
      return counts;
    },
    {
      waiting: 0,
      queued: 0,
      generating: 0,
      completed: 0,
      failed: 0
    } satisfies Record<BulkStatus, number>
  );
  const behaviorResultExportRows = useMemo<BehaviorCommentResultExportRow[]>(
    () =>
      selectedStudents.flatMap((student) => {
        const input = studentInputs[student.id] || makeInitialStudentInput();
        if (input.status !== "completed" && input.status !== "failed") return [];

        const effectiveDraft = getEffectiveRecordContent({
          finalContent: input.finalContent,
          editedContent: input.editedContent,
          aiContent: input.aiContent,
          draftText: input.result?.draft
        });
        const hasCompletedDraft = input.status === "completed" && effectiveDraft.trim().length > 0;
        if (input.status === "completed" && !hasCompletedDraft) return [];

        return [
          {
            grade: student.grade,
            className: student.className,
            number: student.number,
            name: student.name,
            department: departmentOptions.find((option) => option.value === student.department)?.label || student.department,
            draft: hasCompletedDraft ? effectiveDraft : "",
            similarityPercentage: hasCompletedDraft ? input.quality?.percentage : null,
            similarityStatus: hasCompletedDraft ? input.quality?.status : null,
            generationStatus: input.status
          }
        ];
      }),
    [departmentOptions, selectedStudents, studentInputs]
  );
  const completedExportResultCount = behaviorResultExportRows.filter((row) => row.generationStatus === "completed" && row.draft.trim().length > 0).length;

  function departmentLabel(value: string) {
    return departmentOptions.find((option) => option.value === value)?.label || value;
  }

  function patchStudentInput(studentId: string, patch: Partial<StudentBehaviorInput>, resetResult = true) {
    setStudentInputs((current) => {
      const previous = current[studentId] || makeInitialStudentInput();
      return {
        ...current,
        [studentId]: {
          ...previous,
          ...patch,
          ...(resetResult
            ? {
                status: "waiting" as BulkStatus,
                result: null,
                aiContent: "",
                editedContent: "",
                finalContent: "",
                lifecycleStatus: "ai_generated" as RecordDraftLifecycleStatus,
                lastSavedEditedContent: "",
                pendingRegeneration: null,
                showCompare: false,
                isSavingDraft: false,
                isRegenerating: false,
                quality: null,
                error: "",
                savedMessage: ""
              }
            : {})
        }
      };
    });
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) => (current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]));
  }

  function toggleFilteredStudents() {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredStudents.map((student) => student.id));
      setSelectedStudentIds((current) => current.filter((id) => !filteredIds.has(id)));
      return;
    }

    setSelectedStudentIds((current) => Array.from(new Set([...current, ...filteredStudents.map((student) => student.id)])));
  }

  function clearSelection() {
    setSelectedStudentIds([]);
  }

  function updateBulkInput(patch: Partial<BulkApplyInput>) {
    setBulkInput((current) => ({
      ...current,
      ...patch
    }));
  }

  function applyBulkInputToSelected() {
    if (selectedStudentIds.length === 0) {
      setMessage("일괄 적용할 학생을 먼저 선택하세요.");
      return;
    }

    const hasValues =
      bulkInput.schoolLifeAreas.length > 0 ||
      bulkInput.lifeAttitudeKeywords.length > 0 ||
      bulkInput.relationshipKeywords.length > 0 ||
      bulkInput.responsibilityKeywords.length > 0 ||
      bulkInput.behaviorImprovements.length > 0 ||
      bulkInput.homeroomMemo.trim().length > 0;

    if (!hasValues) {
      setMessage("일괄 적용할 키워드, 보완점 또는 메모를 입력하세요.");
      return;
    }

    setStudentInputs((current) => {
      const next = { ...current };
      selectedStudentIds.forEach((studentId) => {
        const previous = next[studentId] || makeInitialStudentInput();
        next[studentId] = {
          ...previous,
          schoolLifeAreas: bulkInput.schoolLifeAreas.length > 0 ? [...bulkInput.schoolLifeAreas] : previous.schoolLifeAreas,
          lifeAttitudeKeywords: bulkInput.lifeAttitudeKeywords.length > 0 ? [...bulkInput.lifeAttitudeKeywords] : previous.lifeAttitudeKeywords,
          relationshipKeywords: bulkInput.relationshipKeywords.length > 0 ? [...bulkInput.relationshipKeywords] : previous.relationshipKeywords,
          responsibilityKeywords: bulkInput.responsibilityKeywords.length > 0 ? [...bulkInput.responsibilityKeywords] : previous.responsibilityKeywords,
          behaviorImprovements: bulkInput.behaviorImprovements.length > 0 ? [...bulkInput.behaviorImprovements] : previous.behaviorImprovements,
          homeroomMemo: bulkInput.homeroomMemo.trim().length > 0 ? bulkInput.homeroomMemo : previous.homeroomMemo,
          status: "waiting",
          result: null,
          aiContent: "",
          editedContent: "",
          finalContent: "",
          lifecycleStatus: "ai_generated",
          lastSavedEditedContent: "",
          pendingRegeneration: null,
          showCompare: false,
          isSavingDraft: false,
          isRegenerating: false,
          quality: null,
          error: "",
          savedMessage: ""
        };
      });
      return next;
    });
    setMessage(`선택한 ${selectedStudentIds.length}명에게 입력값을 적용했습니다.`);
  }

  function copyPreviousStudentValues(studentId: string) {
    const index = filteredStudents.findIndex((student) => student.id === studentId);
    const previousStudent = index > 0 ? filteredStudents[index - 1] : undefined;
    if (!previousStudent) {
      setMessage("복사할 이전 학생 값이 없습니다.");
      return;
    }

    const previousInput = studentInputs[previousStudent.id] || makeInitialStudentInput();
    patchStudentInput(studentId, {
      schoolLifeAreas: [...previousInput.schoolLifeAreas],
      lifeAttitudeKeywords: [...previousInput.lifeAttitudeKeywords],
      relationshipKeywords: [...previousInput.relationshipKeywords],
      responsibilityKeywords: [...previousInput.responsibilityKeywords],
      behaviorImprovements: [...previousInput.behaviorImprovements],
      homeroomMemo: previousInput.homeroomMemo
    });
    setMessage(`${previousStudent.name} 학생의 입력값을 복사했습니다.`);
  }

  function copyPreviousValuesToSelected() {
    const selectedVisibleStudents = filteredStudents.filter((student) => selectedStudentIdSet.has(student.id));
    if (selectedVisibleStudents.length === 0) {
      setMessage("이전 값을 복사할 학생을 먼저 선택하세요.");
      return;
    }

    let copiedCount = 0;
    setStudentInputs((current) => {
      const next = { ...current };

      selectedVisibleStudents.forEach((student) => {
        const visibleIndex = filteredStudents.findIndex((item) => item.id === student.id);
        const previousStudent = visibleIndex > 0 ? filteredStudents[visibleIndex - 1] : undefined;
        if (!previousStudent) return;

        const previousInput = next[previousStudent.id] || makeInitialStudentInput();
        const currentInput = next[student.id] || makeInitialStudentInput();
        next[student.id] = {
          ...currentInput,
          schoolLifeAreas: [...previousInput.schoolLifeAreas],
          lifeAttitudeKeywords: [...previousInput.lifeAttitudeKeywords],
          relationshipKeywords: [...previousInput.relationshipKeywords],
          responsibilityKeywords: [...previousInput.responsibilityKeywords],
          behaviorImprovements: [...previousInput.behaviorImprovements],
          homeroomMemo: previousInput.homeroomMemo,
          status: "waiting",
          result: null,
          aiContent: "",
          editedContent: "",
          finalContent: "",
          lifecycleStatus: "ai_generated",
          lastSavedEditedContent: "",
          pendingRegeneration: null,
          showCompare: false,
          isSavingDraft: false,
          isRegenerating: false,
          quality: null,
          error: "",
          savedMessage: ""
        };
        copiedCount += 1;
      });

      return next;
    });

    setMessage(copiedCount > 0 ? `선택한 ${copiedCount}명에게 바로 이전 행의 입력값을 복사했습니다.` : "복사할 이전 행이 없습니다.");
  }

  function applyQualityAnalysis(generatedDrafts: DraftSimilarityInput[]) {
    if (generatedDrafts.length === 0) {
      setQualitySelectedStudentIds([]);
      return { analyzedCount: 0, duplicateCount: 0, similarCount: 0 };
    }

    const qualityResults = analyzeDraftSimilarity(generatedDrafts);
    const duplicateIds = generatedDrafts
      .filter((item) => qualityResults[item.studentId]?.status === "duplicate")
      .map((item) => item.studentId);
    const similarCount = generatedDrafts.filter((item) => qualityResults[item.studentId]?.status === "similar").length;

    setStudentInputs((current) => {
      const next = { ...current };
      generatedDrafts.forEach((item) => {
        next[item.studentId] = {
          ...(next[item.studentId] || makeInitialStudentInput()),
          quality: qualityResults[item.studentId] || null
        };
      });
      return next;
    });
    setQualitySelectedStudentIds(duplicateIds);

    return {
      analyzedCount: generatedDrafts.length,
      duplicateCount: duplicateIds.length,
      similarCount
    };
  }

  function toggleQualitySelection(studentId: string) {
    const input = studentInputs[studentId];
    if (input?.quality?.status !== "duplicate") return;
    if (!includeFinalizedInRegeneration && input.lifecycleStatus === "finalized") return;
    setQualitySelectedStudentIds((current) => (current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]));
  }

  function buildPayload(student: Student, input: StudentBehaviorInput): BehaviorRecordFormPayload {
    const industrialAttitudes = getSelectedIndustrialAttitudes(input);

    return {
      mode: "behavior",
      studentName: student.name,
      grade: student.grade,
      department: student.department,
      className: student.className,
      schoolLifeAreas: input.schoolLifeAreas,
      industrialAttitudes,
      behaviorImprovements: input.behaviorImprovements,
      homeroomMemo: input.homeroomMemo,
      lengthOption,
      writingStyle,
      writingPerspective
    };
  }

  async function generateForStudents(
    targetStudents: Student[],
    options: { includeCompleted?: boolean; includeFinalized?: boolean; saveMode?: "insert" | "replace-latest" } = {}
  ) {
    const saveMode = options.saveMode || "insert";
    const inputSnapshot = new Map(targetStudents.map((student) => [student.id, studentInputs[student.id] || makeInitialStudentInput()]));
    const finalizedSkippedCount = targetStudents.filter((student) => {
      const input = inputSnapshot.get(student.id) || makeInitialStudentInput();
      return !options.includeFinalized && input.lifecycleStatus === "finalized";
    }).length;
    const completedSkippedCount = targetStudents.filter((student) => {
      const input = inputSnapshot.get(student.id) || makeInitialStudentInput();
      return !options.includeCompleted && (options.includeFinalized || input.lifecycleStatus !== "finalized") && input.status === "completed";
    }).length;
    const notReadySkippedCount = targetStudents.filter((student) => {
      const input = inputSnapshot.get(student.id) || makeInitialStudentInput();
      return (
        (options.includeCompleted || input.status !== "completed") &&
        (options.includeFinalized || input.lifecycleStatus !== "finalized") &&
        !isStudentReady(input)
      );
    }).length;
    const runnableStudents = targetStudents.filter((student) => {
      const input = inputSnapshot.get(student.id) || makeInitialStudentInput();
      return (options.includeCompleted || input.status !== "completed") && (options.includeFinalized || input.lifecycleStatus !== "finalized") && isStudentReady(input);
    });
    const generatedDrafts: DraftSimilarityInput[] = [];

    if (runnableStudents.length === 0) {
      setMessage(
        finalizedSkippedCount > 0 && notReadySkippedCount === 0
          ? "생성 가능한 학생이 없습니다. 최종 확정 학생은 기본적으로 제외됩니다."
          : completedSkippedCount > 0 && finalizedSkippedCount === 0 && notReadySkippedCount === 0
            ? "생성 가능한 학생이 없습니다. 이미 완료된 학생은 제외됩니다."
          : "생성 가능한 학생이 없습니다. 담임 관찰 메모, 학교생활 영역, 생활태도/협업/책임감 키워드, 보완점 중 하나 이상 입력하세요."
      );
      return;
    }

    const skippedMessages = [
      finalizedSkippedCount > 0 ? `최종 확정 ${finalizedSkippedCount}명 제외` : "",
      completedSkippedCount > 0 ? `완료 ${completedSkippedCount}명 제외` : "",
      notReadySkippedCount > 0 ? `생성 근거 없는 ${notReadySkippedCount}명 대기` : ""
    ].filter(Boolean);
    setMessage(skippedMessages.length > 0 ? `${skippedMessages.join(", ")} 후 생성합니다.` : "");
    setStudentInputs((current) => {
      const next = { ...current };
      runnableStudents.forEach((student) => {
        next[student.id] = {
          ...(next[student.id] || makeInitialStudentInput()),
          status: "queued",
          result: null,
          aiContent: "",
          editedContent: "",
          finalContent: "",
          lifecycleStatus: "ai_generated",
          lastSavedEditedContent: "",
          pendingRegeneration: null,
          showCompare: false,
          isSavingDraft: false,
          isRegenerating: false,
          quality: null,
          error: "",
          savedMessage: ""
        };
      });
      return next;
    });

    await runWithConcurrency(runnableStudents, concurrencyLimit, async (student) => {
      const input = inputSnapshot.get(student.id) || makeInitialStudentInput();
      const payload = buildPayload(student, input);

      if (process.env.NODE_ENV !== "production") {
        console.log("[bulk-behavior-comment] UI state", {
          studentId: student.id,
          studentName: student.name,
          schoolLifeAreas: input.schoolLifeAreas,
          lifeAttitudeKeywords: input.lifeAttitudeKeywords,
          relationshipKeywords: input.relationshipKeywords,
          responsibilityKeywords: input.responsibilityKeywords,
          behaviorImprovements: input.behaviorImprovements,
          homeroomMemoLength: input.homeroomMemo.trim().length
        });
        console.log("[bulk-behavior-comment] API payload", {
          studentId: student.id,
          studentName: student.name,
          schoolLifeAreas: payload.schoolLifeAreas,
          industrialAttitudes: payload.industrialAttitudes,
          behaviorImprovements: payload.behaviorImprovements,
          homeroomMemoLength: payload.homeroomMemo.trim().length,
          lengthOption: payload.lengthOption,
          writingStyle: payload.writingStyle,
          writingPerspective: payload.writingPerspective
        });
      }

      patchStudentInput(student.id, { status: "generating", error: "", savedMessage: "" }, false);

      try {
        const response = await postGenerateApi("/api/generate/behavior-comment", payload);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `생성 API 오류: ${response.status}`);
        }

        const result = (await response.json()) as GenerateResponse;
        if (!result.draft) {
          throw new Error(result.warnings?.join(" ") || "초안을 생성하지 못했습니다.");
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("[bulk-behavior-comment] API result", {
            studentId: student.id,
            studentName: student.name,
            warnings: result.warnings,
            draftLength: result.draft.length
          });
        }

        const saveResult = await saveRecordDraft({
          mode: "behavior",
          studentId: student.id,
          payload,
          result,
          saveMode
        });

        if (saveResult.error) {
          setStudentInputs((current) => ({
            ...current,
            [student.id]: {
              ...(current[student.id] || makeInitialStudentInput()),
              status: "failed",
              result,
              aiContent: result.draft || "",
              editedContent: result.draft || "",
              finalContent: "",
              lifecycleStatus: "ai_generated",
              lastSavedEditedContent: "",
              pendingRegeneration: null,
              showCompare: false,
              isSavingDraft: false,
              isRegenerating: false,
              quality: null,
              error: `저장 실패: ${saveResult.error}`,
              savedMessage: ""
            }
          }));
          return;
        }

        setStudentInputs((current) => ({
          ...current,
          [student.id]: {
            ...(current[student.id] || makeInitialStudentInput()),
            status: "completed",
            result,
            aiContent: result.draft,
            editedContent: result.draft,
            finalContent: "",
            lifecycleStatus: "ai_generated",
            lastSavedEditedContent: result.draft,
            pendingRegeneration: null,
            showCompare: false,
            isSavingDraft: false,
            isRegenerating: false,
            quality: null,
            error: "",
            savedMessage: saveMode === "replace-latest" ? "record_drafts 최신 초안 업데이트 완료" : "record_drafts 저장 완료"
          }
        }));
        generatedDrafts.push({
          studentId: student.id,
          studentName: student.name,
          draft: result.draft
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
        setStudentInputs((current) => ({
          ...current,
          [student.id]: {
            ...(current[student.id] || makeInitialStudentInput()),
            status: "failed",
            isSavingDraft: false,
            isRegenerating: false,
            quality: null,
            error: message,
            savedMessage: ""
          }
        }));
      }
    });

    const qualitySummary = applyQualityAnalysis(generatedDrafts);
    if (qualitySummary.analyzedCount > 1) {
      setMessage(
        `일괄 생성 작업이 끝났습니다. 이번 생성 ${qualitySummary.analyzedCount}명 기준 중복 의심 ${qualitySummary.duplicateCount}명, 유사 ${qualitySummary.similarCount}명입니다.`
      );
      return;
    }

    setMessage("일괄 생성 작업이 끝났습니다. 비교할 생성 결과가 2명 미만입니다.");
  }

  async function generateSelectedStudents() {
    await generateForStudents(selectedStudents);
  }

  async function regenerateFailedStudents() {
    await generateForStudents(failedStudents, { includeFinalized: includeFinalizedInRegeneration });
  }

  function updateEditedContent(studentId: string, value: string) {
    setStudentInputs((current) => {
      const previous = current[studentId] || makeInitialStudentInput();
      return {
        ...current,
        [studentId]: {
          ...previous,
          editedContent: value,
          finalContent: "",
          lifecycleStatus: value === previous.lastSavedEditedContent ? "saved" : "editing",
          pendingRegeneration: null,
          savedMessage: ""
        }
      };
    });
  }

  async function saveEditedDraftForStudent(student: Student, source: "manual" | "auto" = "manual") {
    const input = studentInputs[student.id] || makeInitialStudentInput();
    const content = input.editedContent || input.aiContent || input.result?.draft || "";
    if (!content || input.lifecycleStatus === "finalized") return;

    setStudentInputs((current) => ({
      ...current,
      [student.id]: {
        ...(current[student.id] || makeInitialStudentInput()),
        isSavingDraft: true,
        savedMessage: ""
      }
    }));

    const saveResult = await saveEditedRecordDraft({
      mode: "behavior",
      studentId: student.id,
      payload: buildPayload(student, input),
      result: input.result,
      aiContent: input.aiContent || input.result?.draft || content,
      editedContent: content,
      status: "saved"
    });

    setStudentInputs((current) => {
      const previous = current[student.id] || makeInitialStudentInput();
      if (saveResult.error) {
        return {
          ...current,
          [student.id]: {
            ...previous,
            isSavingDraft: false,
            savedMessage: `저장 실패: ${saveResult.error}`
          }
        };
      }

      return {
        ...current,
        [student.id]: {
          ...previous,
          editedContent: content,
          lifecycleStatus: "saved",
          lastSavedEditedContent: content,
          isSavingDraft: false,
          savedMessage: source === "auto" ? "3초 자동 저장 완료" : "교사 수정본 저장 완료"
        }
      };
    });
  }

  async function finalizeDraftForStudent(student: Student) {
    const input = studentInputs[student.id] || makeInitialStudentInput();
    const content = getEffectiveRecordContent({
      finalContent: input.finalContent,
      editedContent: input.editedContent,
      aiContent: input.aiContent,
      draftText: input.result?.draft
    });
    if (!content) return;

    setStudentInputs((current) => ({
      ...current,
      [student.id]: {
        ...(current[student.id] || makeInitialStudentInput()),
        isSavingDraft: true,
        savedMessage: ""
      }
    }));

    const saveResult = await finalizeRecordDraft({
      mode: "behavior",
      studentId: student.id,
      payload: buildPayload(student, input),
      result: input.result,
      aiContent: input.aiContent || input.result?.draft || content,
      editedContent: input.editedContent || content,
      finalContent: content
    });

    setStudentInputs((current) => {
      const previous = current[student.id] || makeInitialStudentInput();
      if (saveResult.error) {
        return {
          ...current,
          [student.id]: {
            ...previous,
            isSavingDraft: false,
            savedMessage: `최종 확정 실패: ${saveResult.error}`
          }
        };
      }

      return {
        ...current,
        [student.id]: {
          ...previous,
          editedContent: previous.editedContent || content,
          finalContent: content,
          lifecycleStatus: "finalized",
          lastSavedEditedContent: previous.editedContent || content,
          isSavingDraft: false,
          savedMessage: "최종본 확정 완료"
        }
      };
    });
  }

  async function unfinalizeDraftForStudent(student: Student) {
    const input = studentInputs[student.id] || makeInitialStudentInput();
    const content = input.editedContent || input.finalContent || input.aiContent || input.result?.draft || "";
    if (!content) return;

    setStudentInputs((current) => ({
      ...current,
      [student.id]: {
        ...(current[student.id] || makeInitialStudentInput()),
        isSavingDraft: true,
        savedMessage: ""
      }
    }));

    const saveResult = await unfinalizeRecordDraft({
      mode: "behavior",
      studentId: student.id,
      payload: buildPayload(student, input),
      result: input.result,
      aiContent: input.aiContent || input.result?.draft || content,
      editedContent: content
    });

    setStudentInputs((current) => {
      const previous = current[student.id] || makeInitialStudentInput();
      if (saveResult.error) {
        return {
          ...current,
          [student.id]: {
            ...previous,
            isSavingDraft: false,
            savedMessage: `최종 해제 실패: ${saveResult.error}`
          }
        };
      }

      return {
        ...current,
        [student.id]: {
          ...previous,
          editedContent: content,
          finalContent: "",
          lifecycleStatus: "saved",
          lastSavedEditedContent: content,
          isSavingDraft: false,
          savedMessage: "최종 확정 해제 완료"
        }
      };
    });
  }

  async function regenerateAiForStudents(targetStudents: Student[], options: { includeFinalized?: boolean } = {}) {
    const inputSnapshot = new Map(targetStudents.map((student) => [student.id, studentInputs[student.id] || makeInitialStudentInput()]));
    const finalizedSkippedCount = targetStudents.filter((student) => {
      const input = inputSnapshot.get(student.id) || makeInitialStudentInput();
      return !options.includeFinalized && input.lifecycleStatus === "finalized";
    }).length;
    const runnableStudents = targetStudents.filter((student) => {
      const input = inputSnapshot.get(student.id) || makeInitialStudentInput();
      return (options.includeFinalized || input.lifecycleStatus !== "finalized") && isStudentReady(input);
    });
    if (runnableStudents.length === 0) {
      setMessage(finalizedSkippedCount > 0 ? "AI 다시 생성 가능한 학생이 없습니다. 최종 확정 학생은 기본적으로 제외됩니다." : "AI 다시 생성 가능한 학생이 없습니다.");
      return;
    }

    setMessage("새 AI 결과를 생성합니다. 기존 교사 수정본은 유지됩니다.");
    setStudentInputs((current) => {
      const next = { ...current };
      runnableStudents.forEach((student) => {
        next[student.id] = {
          ...(next[student.id] || makeInitialStudentInput()),
          isRegenerating: true,
          pendingRegeneration: null,
          savedMessage: ""
        };
      });
      return next;
    });

    await runWithConcurrency(runnableStudents, concurrencyLimit, async (student) => {
      const input = inputSnapshot.get(student.id) || makeInitialStudentInput();
      const payload = buildPayload(student, input);

      try {
        const response = await postGenerateApi("/api/generate/behavior-comment", payload);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `생성 API 오류: ${response.status}`);
        }

        const result = (await response.json()) as GenerateResponse;
        if (!result.draft) {
          throw new Error(result.warnings?.join(" ") || "새 AI 결과를 생성하지 못했습니다.");
        }

        setStudentInputs((current) => ({
          ...current,
          [student.id]: {
            ...(current[student.id] || makeInitialStudentInput()),
            pendingRegeneration: result,
            isRegenerating: false,
            savedMessage: "새 AI 결과가 생성되었습니다. 현재 유지 또는 새 결과 사용을 선택하세요."
          }
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 다시 생성 중 오류가 발생했습니다.";
        setStudentInputs((current) => ({
          ...current,
          [student.id]: {
            ...(current[student.id] || makeInitialStudentInput()),
            isRegenerating: false,
            savedMessage: message
          }
        }));
      }
    });

    setMessage("AI 다시 생성이 끝났습니다. 각 학생별 새 결과 사용 여부를 선택하세요.");
  }

  function keepCurrentDraftForStudent(studentId: string) {
    setStudentInputs((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] || makeInitialStudentInput()),
        pendingRegeneration: null,
        savedMessage: "현재 수정본을 유지했습니다."
      }
    }));
  }

  async function useRegeneratedDraftForStudent(student: Student) {
    const input = studentInputs[student.id] || makeInitialStudentInput();
    if (!input.pendingRegeneration?.draft) return;

    const nextAiContent = input.aiContent || input.result?.draft || input.pendingRegeneration.draft;
    const nextEditedContent = input.pendingRegeneration.draft;

    setStudentInputs((current) => ({
      ...current,
      [student.id]: {
        ...(current[student.id] || makeInitialStudentInput()),
        result: input.pendingRegeneration,
        aiContent: nextAiContent,
        editedContent: nextEditedContent,
        finalContent: "",
        lifecycleStatus: "saved",
        pendingRegeneration: null,
        isSavingDraft: true,
        savedMessage: ""
      }
    }));

    const saveResult = await saveEditedRecordDraft({
      mode: "behavior",
      studentId: student.id,
      payload: buildPayload(student, input),
      result: input.pendingRegeneration,
      aiContent: nextAiContent,
      editedContent: nextEditedContent,
      status: "saved"
    });

    setStudentInputs((current) => {
      const previous = current[student.id] || makeInitialStudentInput();
      if (saveResult.error) {
        return {
          ...current,
          [student.id]: {
            ...previous,
            lifecycleStatus: "editing",
            isSavingDraft: false,
            savedMessage: `새 결과 저장 실패: ${saveResult.error}`
          }
        };
      }

      return {
        ...current,
        [student.id]: {
          ...previous,
          lastSavedEditedContent: nextEditedContent,
          isSavingDraft: false,
          savedMessage: "새 AI 결과를 교사 수정본으로 저장했습니다."
        }
      };
    });
  }

  async function regenerateQualitySelectedStudents() {
    if (qualityRegenerationStudents.length === 0) {
      setMessage("중복 의심으로 선택된 학생이 없습니다.");
      return;
    }

    await regenerateAiForStudents(qualityRegenerationStudents, { includeFinalized: includeFinalizedInRegeneration });
  }

  async function generateSingleStudent(student: Student) {
    setSelectedStudentIds((current) => (current.includes(student.id) ? current : [...current, student.id]));
    await generateForStudents([student]);
  }

  async function regenerateSingleStudent(student: Student) {
    setSelectedStudentIds((current) => (current.includes(student.id) ? current : [...current, student.id]));
    await regenerateAiForStudents([student], { includeFinalized: includeFinalizedInRegeneration });
  }

  async function copyDraft(studentId: string) {
    const input = studentInputs[studentId] || makeInitialStudentInput();
    const content = getEffectiveRecordContent({
      finalContent: input.finalContent,
      editedContent: input.editedContent,
      aiContent: input.aiContent,
      draftText: input.result?.draft
    });
    if (!content) return;

    await navigator.clipboard.writeText(content);
    patchStudentInput(studentId, { savedMessage: "클립보드에 복사했습니다." }, false);
  }

  async function downloadBehaviorResults() {
    if (completedExportResultCount === 0) return;

    try {
      await downloadBehaviorCommentResults(behaviorResultExportRows);
      setMessage(`생성 완료 결과 ${completedExportResultCount}건을 엑셀로 다운로드했습니다.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "엑셀 다운로드 중 오류가 발생했습니다.";
      setMessage(errorMessage);
    }
  }

  useEffect(() => {
    const dirtyStudents = students.filter((student) => {
      const input = studentInputs[student.id];
      return (
        input?.status === "completed" &&
        input.lifecycleStatus !== "finalized" &&
        !input.isSavingDraft &&
        Boolean(input.editedContent) &&
        input.editedContent !== input.lastSavedEditedContent
      );
    });

    if (dirtyStudents.length === 0) return;

    const timer = window.setTimeout(() => {
      dirtyStudents.forEach((student) => {
        void saveEditedDraftForStudent(student, "auto");
      });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [studentInputs, students, lengthOption, writingStyle, writingPerspective]);

  return (
    <div className="min-w-0 space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">AI 학생부 작성</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-950">행동특성 및 종합의견 일괄 생성</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            학생을 여러 명 선택하고 학생별 학교생활 영역, 생활태도, 관계, 책임감, 담임 관찰 메모를 한 행에서 입력해 초안을 생성합니다.
          </p>
        </div>
        <div className="grid w-full grid-cols-4 gap-2 rounded-md border border-slate-200 bg-white p-3 text-center shadow-sm sm:w-auto">
          <div>
            <p className="text-xs font-semibold text-slate-500">선택</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{selectedStudents.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">대기</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{statusCounts.waiting + statusCounts.queued}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">완료</p>
            <p className="mt-1 text-sm font-bold text-emerald-700">{statusCounts.completed}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">실패</p>
            <p className="mt-1 text-sm font-bold text-rose-700">{statusCounts.failed}</p>
          </div>
        </div>
      </section>

      {loadError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{loadError}</div>
      ) : null}

      <section className="panel p-5">
        <div>
          <div className="flex items-center gap-2">
            <Search size={18} className="text-blue-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-950">공통 설정</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">필터와 생성 톤을 정합니다. 필터 결과는 아래 입력 테이블에 바로 표시됩니다.</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-6">
          <label className="space-y-2">
            <span className="field-label">학년</span>
            <select className="input-base" value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)} disabled={isGenerating}>
              <option value="">전체</option>
              {gradeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="field-label">반</span>
            <select className="input-base" value={classFilter} onChange={(event) => setClassFilter(event.target.value)} disabled={isGenerating}>
              <option value="">전체</option>
              {classOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="field-label">학과 필터</span>
            <select className="input-base" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} disabled={isGenerating}>
              <option value="">전체</option>
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="field-label">분량</legend>
            <div className="grid grid-cols-3 gap-2">
              {behaviorLengthOptions.map((option) => {
                const selected = lengthOption === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLengthOption(option.value)}
                    disabled={isGenerating}
                    className={`min-h-11 rounded-md border px-2 py-1.5 text-left transition ${
                      selected ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                    }`}
                  >
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{option.help}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="space-y-2">
            <span className="field-label">문체</span>
            <select className="input-base" value={writingStyle} onChange={(event) => setWritingStyle(event.target.value)} disabled={isGenerating}>
              {writingStyleOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="field-label">작성 관점</span>
            <select className="input-base" value={writingPerspective} onChange={(event) => setWritingPerspective(event.target.value)} disabled={isGenerating}>
              {writingPerspectiveOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="secondary-button" type="button" onClick={toggleFilteredStudents} disabled={filteredStudents.length === 0 || isGenerating}>
            <UsersRound size={17} aria-hidden="true" />
            {allFilteredSelected ? "필터 선택 해제" : "전체 선택"}
          </button>
          <button className="secondary-button" type="button" onClick={clearSelection} disabled={selectedStudents.length === 0 || isGenerating}>
            선택 초기화
          </button>
        </div>
      </section>

      <section className="panel min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">학생별 입력 테이블</h2>
            <p className="mt-1 text-sm text-slate-500">
              필터 결과 {filteredStudents.length}명 중 {selectedStudents.length}명을 선택했습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="primary-button" type="button" onClick={generateSelectedStudents} disabled={!canGenerate}>
              {isGenerating ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
              선택 학생 생성
            </button>
            <button className="secondary-button" type="button" onClick={regenerateFailedStudents} disabled={failedStudents.length === 0 || isGenerating}>
              <RefreshCcw size={17} aria-hidden="true" />
              실패만 재생성
            </button>
          </div>
        </div>

        {selectedStudents.length === 0 ? (
          <div className="border-b border-slate-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">생성할 학생을 선택하세요.</div>
        ) : null}

        {message ? <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">{message}</div> : null}

        <div className="max-h-[72vh] w-full overflow-x-auto overflow-y-auto overscroll-x-contain">
          <table className="w-full min-w-[1440px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold uppercase tracking-normal text-slate-500 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className="w-14 px-3 py-3">선택</th>
                <th className="w-40 px-3 py-3">학생명</th>
                <th className="w-40 px-3 py-3">학교생활 영역</th>
                <th className="w-40 px-3 py-3">생활태도 키워드</th>
                <th className="w-40 px-3 py-3">협업/관계</th>
                <th className="w-40 px-3 py-3">책임감/성실성</th>
                <th className="w-36 px-3 py-3">보완점</th>
                <th className="w-[240px] px-3 py-3">담임 관찰 메모</th>
                <th className="w-24 px-3 py-3">상태</th>
                <th className="w-28 px-3 py-3">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    <Loader2 className="mr-2 inline animate-spin" size={17} aria-hidden="true" />
                    학생 목록 로딩 중
                  </td>
                </tr>
              ) : null}
              {!isLoading && filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    조건에 맞는 학생이 없습니다.
                  </td>
                </tr>
              ) : null}
              {filteredStudents.map((student) => {
                const input = studentInputs[student.id] || makeInitialStudentInput();
                const statusMeta = getStatusMeta(input.status);
                const lifecycleMeta = getRecordDraftLifecycleStatusMeta(input.lifecycleStatus);
                const warnings = getStudentWarnings(input);
                const isRowGenerating = input.status === "generating" || input.status === "queued";
                const selected = selectedStudentIdSet.has(student.id);
                const rowReady = isStudentReady(input);
                const rowCompleted = input.status === "completed";
                const rowFinalized = input.lifecycleStatus === "finalized";

                return (
                  <tr key={student.id} className={`align-top ${selected ? "bg-blue-50/30" : ""}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={selected}
                        onChange={() => toggleStudent(student.id)}
                        disabled={isGenerating}
                        aria-label={`${student.name} 선택`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-950">
                        {student.className} {student.number}번 {student.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {student.grade} · {departmentLabel(student.department)}
                      </p>
                      {warnings.length > 0 ? (
                        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs font-semibold leading-5 text-amber-900">
                          <AlertTriangle className="mr-1 inline" size={13} aria-hidden="true" />
                          필요: {warnings.join(", ")}
                        </div>
                      ) : (
                        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="mr-1 inline" size={13} aria-hidden="true" />
                          생성 가능
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <ChipSelector
                        label="학교생활 영역"
                        options={schoolLifeAreaOptions}
                        values={input.schoolLifeAreas}
                        onChange={(values) => patchStudentInput(student.id, { schoolLifeAreas: values })}
                        disabled={isRowGenerating}
                        compact
                        showLabel={false}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <ChipSelector
                        label="생활태도 키워드"
                        options={lifeAttitudeOptions}
                        values={input.lifeAttitudeKeywords}
                        onChange={(values) => patchStudentInput(student.id, { lifeAttitudeKeywords: values })}
                        disabled={isRowGenerating}
                        compact
                        showLabel={false}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <ChipSelector
                        label="협업/관계"
                        options={relationshipOptions}
                        values={input.relationshipKeywords}
                        onChange={(values) => patchStudentInput(student.id, { relationshipKeywords: values })}
                        disabled={isRowGenerating}
                        compact
                        showLabel={false}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <ChipSelector
                        label="책임감/성실성"
                        options={responsibilityOptions}
                        values={input.responsibilityKeywords}
                        onChange={(values) => patchStudentInput(student.id, { responsibilityKeywords: values })}
                        disabled={isRowGenerating}
                        compact
                        showLabel={false}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <ChipSelector
                        label="보완점"
                        options={behaviorImprovementOptions}
                        values={input.behaviorImprovements}
                        onChange={(values) => patchStudentInput(student.id, { behaviorImprovements: values })}
                        disabled={isRowGenerating}
                        compact
                        showLabel={false}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <textarea
                        className="input-base min-h-28 resize-y leading-6"
                        placeholder="학생별 담임 관찰 내용을 입력하세요."
                        value={input.homeroomMemo}
                        onChange={(event) => patchStudentInput(student.id, { homeroomMemo: event.target.value })}
                        disabled={isRowGenerating}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-bold ${statusMeta.className}`}>
                        {input.status === "generating" ? <Loader2 className="mr-1 animate-spin" size={13} aria-hidden="true" /> : null}
                        {statusMeta.label}
                      </span>
                      {input.result?.draft ? (
                        <span className={`mt-2 inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-bold ${lifecycleMeta.className}`}>
                          <span className={`mr-1 h-2 w-2 rounded-full ${lifecycleMeta.dotClassName}`} aria-hidden="true" />
                          {lifecycleMeta.label}
                        </span>
                      ) : null}
                      {input.savedMessage ? <p className="mt-2 text-xs font-semibold text-emerald-700">{input.savedMessage}</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="grid gap-2">
                        <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={() => copyPreviousStudentValues(student.id)} disabled={isGenerating}>
                          <Copy size={15} aria-hidden="true" />
                          이전 복사
                        </button>
                        <button
                          className="secondary-button min-h-10 px-3 py-1.5"
                          type="button"
                          onClick={() => generateSingleStudent(student)}
                          disabled={isGenerating || !rowReady || rowCompleted || rowFinalized}
                        >
                          <Play size={15} aria-hidden="true" />
                          {input.status === "failed" ? "재생성" : rowCompleted ? "완료" : "개별 생성"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">생성 결과</h2>
            <p className="mt-1 text-sm text-slate-500">학생별 생성 결과와 마지막 생성 묶음 기준 유사도를 확인합니다.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <p className="text-xs font-semibold text-slate-500">생성 완료된 결과만 다운로드됩니다.</p>
            <div className="flex flex-wrap gap-2">
              <button className="secondary-button" type="button" onClick={downloadBehaviorResults} disabled={completedExportResultCount === 0}>
                <Download size={17} aria-hidden="true" />
                행특 결과 엑셀 다운로드
              </button>
              <button className="primary-button" type="button" onClick={regenerateQualitySelectedStudents} disabled={qualityRegenerationStudents.length === 0 || isGenerating}>
                <RefreshCcw size={17} aria-hidden="true" />
                중복 의심 학생만 재생성
              </button>
            </div>
          </div>
        </div>

        <details className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">재생성 고급 옵션</summary>
          <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={includeFinalizedInRegeneration}
              onChange={(event) => setIncludeFinalizedInRegeneration(event.target.checked)}
              disabled={isGenerating}
            />
            <span>
              최종 확정 학생 포함
              <span className="mt-1 block text-xs font-medium text-slate-500">실패, 중복 의심, 학생별 AI 다시 생성에 적용됩니다.</span>
            </span>
          </label>
        </details>

        {duplicateQualityStudents.length > 0 ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-800">
            중복 의심 {duplicateQualityStudents.length}명 중 {qualityRegenerationStudents.length}명이 재생성 대상으로 선택되었습니다.
          </div>
        ) : null}

        {selectedStudents.length === 0 ? (
          <div className="p-5 text-sm font-semibold text-slate-500">학생을 선택하면 생성 결과가 표시됩니다.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {selectedStudents.map((student) => {
              const input = studentInputs[student.id] || makeInitialStudentInput();
              const statusMeta = getStatusMeta(input.status);
              const effectiveDraft = getEffectiveRecordContent({
                finalContent: input.finalContent,
                editedContent: input.editedContent,
                aiContent: input.aiContent,
                draftText: input.result?.draft
              });
              const hasDraft = effectiveDraft.length > 0;
              const qualityMeta = getDraftSimilarityStatusMeta(input.quality?.status);
              const qualityPercentage = input.quality ? `${input.quality.percentage}%` : "-";
              const isDuplicateQuality = input.quality?.status === "duplicate" && hasDraft;
              const qualitySelectable = isDuplicateQuality && (includeFinalizedInRegeneration || input.lifecycleStatus !== "finalized");
              const qualityChecked = qualitySelectable && qualitySelectedStudentIdSet.has(student.id);
              const canRegenerate =
                (includeFinalizedInRegeneration || input.lifecycleStatus !== "finalized") &&
                !isGenerating &&
                !input.isRegenerating &&
                !["queued", "generating"].includes(input.status) &&
                (hasDraft || input.status === "failed") &&
                isStudentReady(input);

              return (
                <BulkDraftLifecycleEditor
                  key={student.id}
                  studentInfo={
                    <>
                      <p className="font-bold text-slate-950">
                        {student.className} {student.number}번 {student.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {student.grade} · {departmentLabel(student.department)}
                      </p>
                      {input.quality?.matchedStudentName ? <p className="mt-2 text-xs font-semibold text-slate-500">가장 유사: {input.quality.matchedStudentName}</p> : null}
                    </>
                  }
                  statusBadges={
                    <>
                      <span className={`inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-bold ${statusMeta.className}`}>생성 {statusMeta.label}</span>
                      <span className={`inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-bold ${qualityMeta.className}`}>
                        유사도 {qualityPercentage} · {qualityMeta.label}
                      </span>
                    </>
                  }
                  qualitySelector={
                    <label
                      className={`flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold ${
                        isDuplicateQuality ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={qualityChecked}
                        onChange={() => toggleQualitySelection(student.id)}
                        disabled={!qualitySelectable || isGenerating}
                      />
                      중복 의심 선택
                    </label>
                  }
                  aiContent={input.aiContent}
                  editedContent={input.editedContent}
                  finalContent={input.finalContent}
                  draftText={input.result?.draft}
                  lifecycleStatus={input.lifecycleStatus}
                  error={input.error}
                  warnings={input.result?.warnings}
                  savedMessage={input.savedMessage}
                  pendingRegeneration={input.pendingRegeneration}
                  showCompare={input.showCompare}
                  isSaving={input.isSavingDraft}
                  isRegenerating={input.isRegenerating}
                  canRegenerate={canRegenerate}
                  onEditedContentChange={(value) => updateEditedContent(student.id, value)}
                  onSave={() => void saveEditedDraftForStudent(student)}
                  onCopy={() => void copyDraft(student.id)}
                  onToggleCompare={() => patchStudentInput(student.id, { showCompare: !input.showCompare }, false)}
                  onRegenerate={() => void regenerateSingleStudent(student)}
                  onKeepCurrentDraft={() => keepCurrentDraftForStudent(student.id)}
                  onUseRegeneratedDraft={() => void useRegeneratedDraftForStudent(student)}
                  onFinalize={() => void finalizeDraftForStudent(student)}
                  onUnfinalize={() => void unfinalizeDraftForStudent(student)}
                />
              );
            })}
          </div>
        )}
      </section>

      <details className="panel p-5">
        <summary className="cursor-pointer text-lg font-bold text-slate-950">일괄 적용 보조 기능</summary>
        <p className="mt-1 text-sm text-slate-500">반복 입력이 필요할 때만 열어서 사용합니다. 입력한 값이 있는 항목만 선택 학생에게 적용됩니다.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="secondary-button" type="button" onClick={applyBulkInputToSelected} disabled={selectedStudents.length === 0 || isGenerating}>
            <Copy size={17} aria-hidden="true" />
            선택 학생에게 적용
          </button>
          <button className="secondary-button" type="button" onClick={copyPreviousValuesToSelected} disabled={selectedStudents.length === 0 || isGenerating}>
            <Copy size={17} aria-hidden="true" />
            선택 학생 이전 행 복사
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ChipSelector
            label="학교생활 영역"
            options={schoolLifeAreaOptions}
            values={bulkInput.schoolLifeAreas}
            onChange={(values) => updateBulkInput({ schoolLifeAreas: values })}
            disabled={isGenerating}
            compact
          />
          <ChipSelector
            label="생활태도 키워드"
            options={lifeAttitudeOptions}
            values={bulkInput.lifeAttitudeKeywords}
            onChange={(values) => updateBulkInput({ lifeAttitudeKeywords: values })}
            disabled={isGenerating}
            compact
          />
          <ChipSelector
            label="협업/관계"
            options={relationshipOptions}
            values={bulkInput.relationshipKeywords}
            onChange={(values) => updateBulkInput({ relationshipKeywords: values })}
            disabled={isGenerating}
            compact
          />
          <ChipSelector
            label="책임감/성실성"
            options={responsibilityOptions}
            values={bulkInput.responsibilityKeywords}
            onChange={(values) => updateBulkInput({ responsibilityKeywords: values })}
            disabled={isGenerating}
            compact
          />
          <ChipSelector
            label="보완점"
            options={behaviorImprovementOptions}
            values={bulkInput.behaviorImprovements}
            onChange={(values) => updateBulkInput({ behaviorImprovements: values })}
            disabled={isGenerating}
            compact
          />
          <label className="space-y-2">
            <span className="field-label">담임 관찰 메모</span>
            <textarea
              className="input-base min-h-24 resize-y leading-6"
              placeholder="여러 학생에게 공통으로 적용할 메모가 있을 때 입력하세요."
              value={bulkInput.homeroomMemo}
              onChange={(event) => updateBulkInput({ homeroomMemo: event.target.value })}
              disabled={isGenerating}
            />
          </label>
        </div>
      </details>
    </div>
  );
}
