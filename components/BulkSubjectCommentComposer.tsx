"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, Copy, Loader2, Play, RefreshCcw, Search, Sparkles, UsersRound } from "lucide-react";
import { getFallbackSettingsOptions, loadSettingsOptions, type SettingsOptions } from "@/lib/admin-settings";
import { gradeOptions } from "@/lib/options";
import { saveRecordDraft } from "@/lib/record-drafts";
import { ensureUserProfile, listStudents } from "@/lib/students";
import type { CommentLength, GenerateResponse, Student, SubjectRecordFormPayload } from "@/lib/types";

type BulkStatus = "waiting" | "queued" | "generating" | "completed" | "failed";

type StudentSubjectInput = {
  activityTypes: string[];
  competencies: string[];
  improvements: string[];
  observationMemo: string;
  status: BulkStatus;
  result: GenerateResponse | null;
  error: string;
  savedMessage: string;
};

type BulkApplyInput = Pick<StudentSubjectInput, "activityTypes" | "competencies" | "improvements" | "observationMemo">;

const fallbackSettingsOptions = getFallbackSettingsOptions();
const concurrencyLimit = 3;

const subjectLengthOptions: Array<{ value: CommentLength; label: string; help: string }> = [
  { value: "short", label: "짧게", help: "250~350자" },
  { value: "medium", label: "보통", help: "350~500자" },
  { value: "long", label: "자세히", help: "500~700자" }
];

const writingStyleOptions = ["학생부 기본 문체", "간결한 과정 중심", "실습 역량 중심", "성장/개선 중심"];

function makeInitialStudentInput(): StudentSubjectInput {
  return {
    activityTypes: [],
    competencies: [],
    improvements: [],
    observationMemo: "",
    status: "waiting",
    result: null,
    error: "",
    savedMessage: ""
  };
}

function makeInitialBulkInput(): BulkApplyInput {
  return {
    activityTypes: [],
    competencies: [],
    improvements: [],
    observationMemo: ""
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

function getStudentWarnings(input: StudentSubjectInput) {
  const warnings: string[] = [];

  if (input.activityTypes.length === 0) warnings.push("활동유형");
  if (input.competencies.length === 0) warnings.push("역량");
  if (input.improvements.length === 0) warnings.push("보완점");
  if (input.observationMemo.trim().length < 10) warnings.push("관찰 메모 10자 이상");

  return warnings;
}

function isStudentReady(input: StudentSubjectInput) {
  return input.activityTypes.length > 0 && input.competencies.length > 0 && input.observationMemo.trim().length >= 10;
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

export function BulkSubjectCommentComposer() {
  const [settingsOptions, setSettingsOptions] = useState<SettingsOptions>(() => fallbackSettingsOptions);
  const [schoolId, setSchoolId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentInputs, setStudentInputs] = useState<Record<string, StudentSubjectInput>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [unit, setUnit] = useState("");
  const [lengthOption, setLengthOption] = useState<CommentLength>("medium");
  const [writingStyle, setWritingStyle] = useState(writingStyleOptions[0]);
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
      setSchoolId(profileResult.profile?.school_id || "");
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

  const activityOptions = useMemo(
    () => settingsOptions.subjectChecklistGroups.find((group) => group.key === "subject_activity_type")?.options || [],
    [settingsOptions.subjectChecklistGroups]
  );
  const competencyOptions = useMemo(
    () => settingsOptions.subjectChecklistGroups.find((group) => group.key === "subject_competency")?.options || [],
    [settingsOptions.subjectChecklistGroups]
  );
  const departmentOptions = settingsOptions.departmentOptions;
  const selectedStudentIdSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds]);

  const classOptions = useMemo(() => {
    const classes = students
      .filter((student) => !gradeFilter || student.grade === gradeFilter)
      .filter((student) => !departmentFilter || student.department === departmentFilter)
      .map((student) => student.className)
      .filter(Boolean);

    return sortClassNames(Array.from(new Set(classes)));
  }, [departmentFilter, gradeFilter, students]);

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
    () => selectedStudents.filter((student) => studentInputs[student.id]?.status === "failed"),
    [selectedStudents, studentInputs]
  );
  const isGenerating = selectedStudents.some((student) => ["queued", "generating"].includes(studentInputs[student.id]?.status || "waiting"));
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIdSet.has(student.id));
  const readySelectedCount = selectedStudents.filter((student) => isStudentReady(studentInputs[student.id] || makeInitialStudentInput())).length;
  const canGenerate = Boolean(subjectName.trim()) && readySelectedCount > 0 && !isGenerating;

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

  function departmentLabel(value: string) {
    return departmentOptions.find((option) => option.value === value)?.label || value;
  }

  function patchStudentInput(studentId: string, patch: Partial<StudentSubjectInput>, resetResult = true) {
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
      bulkInput.activityTypes.length > 0 || bulkInput.competencies.length > 0 || bulkInput.improvements.length > 0 || bulkInput.observationMemo.trim().length > 0;

    if (!hasValues) {
      setMessage("일괄 적용할 활동유형, 역량, 보완점 또는 메모를 입력하세요.");
      return;
    }

    setStudentInputs((current) => {
      const next = { ...current };
      selectedStudentIds.forEach((studentId) => {
        const previous = next[studentId] || makeInitialStudentInput();
        next[studentId] = {
          ...previous,
          activityTypes: bulkInput.activityTypes.length > 0 ? [...bulkInput.activityTypes] : previous.activityTypes,
          competencies: bulkInput.competencies.length > 0 ? [...bulkInput.competencies] : previous.competencies,
          improvements: bulkInput.improvements.length > 0 ? [...bulkInput.improvements] : previous.improvements,
          observationMemo: bulkInput.observationMemo.trim().length > 0 ? bulkInput.observationMemo : previous.observationMemo,
          status: "waiting",
          result: null,
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
      activityTypes: [...previousInput.activityTypes],
      competencies: [...previousInput.competencies],
      improvements: [...previousInput.improvements],
      observationMemo: previousInput.observationMemo
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
          activityTypes: [...previousInput.activityTypes],
          competencies: [...previousInput.competencies],
          improvements: [...previousInput.improvements],
          observationMemo: previousInput.observationMemo,
          status: "waiting",
          result: null,
          error: "",
          savedMessage: ""
        };
        copiedCount += 1;
      });

      return next;
    });

    setMessage(copiedCount > 0 ? `선택한 ${copiedCount}명에게 바로 이전 행의 입력값을 복사했습니다.` : "복사할 이전 행이 없습니다.");
  }

  function buildPayload(student: Student, input: StudentSubjectInput): SubjectRecordFormPayload {
    return {
      mode: "subject",
      schoolId,
      selectedStudentId: student.id,
      studentNo: student.number,
      studentName: student.name,
      grade: student.grade,
      department: student.department,
      subjectName,
      textbook: "",
      unit,
      lengthOption,
      writingStyle,
      activityTypes: input.activityTypes,
      competencies: input.competencies,
      improvements: input.improvements,
      observationMemo: input.observationMemo
    };
  }

  async function generateForStudents(targetStudents: Student[]) {
    if (!subjectName.trim()) {
      setMessage("과목명을 입력하세요.");
      return;
    }

    const inputSnapshot = new Map(targetStudents.map((student) => [student.id, studentInputs[student.id] || makeInitialStudentInput()]));
    const runnableStudents = targetStudents.filter((student) => isStudentReady(inputSnapshot.get(student.id) || makeInitialStudentInput()));
    const skippedCount = targetStudents.length - runnableStudents.length;

    if (runnableStudents.length === 0) {
      setMessage("생성 가능한 학생이 없습니다. 활동유형, 역량, 관찰 메모를 확인하세요.");
      return;
    }

    setMessage(skippedCount > 0 ? `입력이 부족한 ${skippedCount}명은 대기 상태로 남기고 생성합니다.` : "");
    setStudentInputs((current) => {
      const next = { ...current };
      runnableStudents.forEach((student) => {
        next[student.id] = {
          ...(next[student.id] || makeInitialStudentInput()),
          status: "queued",
          result: null,
          error: "",
          savedMessage: ""
        };
      });
      return next;
    });

    await runWithConcurrency(runnableStudents, concurrencyLimit, async (student) => {
      const input = inputSnapshot.get(student.id) || makeInitialStudentInput();
      const payload = buildPayload(student, input);

      patchStudentInput(student.id, { status: "generating", error: "", savedMessage: "" }, false);

      try {
        const response = await fetch("/api/generate/subject-comment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `생성 API 오류: ${response.status}`);
        }

        const result = (await response.json()) as GenerateResponse;
        if (!result.draft) {
          throw new Error(result.warnings?.join(" ") || "초안을 생성하지 못했습니다.");
        }

        const saveResult = await saveRecordDraft({
          mode: "subject",
          studentId: student.id,
          payload,
          result
        });

        if (saveResult.error) {
          setStudentInputs((current) => ({
            ...current,
            [student.id]: {
              ...(current[student.id] || makeInitialStudentInput()),
              status: "failed",
              result,
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
            error: "",
            savedMessage: "record_drafts 저장 완료"
          }
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
        setStudentInputs((current) => ({
          ...current,
          [student.id]: {
            ...(current[student.id] || makeInitialStudentInput()),
            status: "failed",
            error: message,
            savedMessage: ""
          }
        }));
      }
    });

    setMessage("일괄 생성 작업이 끝났습니다.");
  }

  async function generateSelectedStudents() {
    await generateForStudents(selectedStudents);
  }

  async function regenerateFailedStudents() {
    await generateForStudents(failedStudents);
  }

  async function generateSingleStudent(student: Student) {
    setSelectedStudentIds((current) => (current.includes(student.id) ? current : [...current, student.id]));
    await generateForStudents([student]);
  }

  async function copyDraft(studentId: string) {
    const result = studentInputs[studentId]?.result;
    if (!result?.draft) return;

    await navigator.clipboard.writeText(result.draft);
    patchStudentInput(studentId, { savedMessage: "클립보드에 복사했습니다." }, false);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">AI 학생부 작성</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-950">과세특 일괄 생성</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            학생을 여러 명 선택하고 학생별 활동유형, 역량, 보완점, 관찰 메모를 다르게 입력해 과세특 초안을 생성합니다.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 rounded-md border border-slate-200 bg-white p-3 text-center shadow-sm">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">공통 입력값</h2>
            <p className="mt-1 text-sm text-slate-500">선택한 모든 학생에게 함께 적용되는 과목 정보입니다.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1.15fr_1.25fr_1fr]">
          <label className="space-y-2">
            <span className="field-label">과목명</span>
            <input
              className="input-base"
              list="bulk-subject-options"
              placeholder="예: PLC제어"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              disabled={isGenerating}
            />
            <datalist id="bulk-subject-options">
              {settingsOptions.subjectOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          <label className="space-y-2">
            <span className="field-label">단원명</span>
            <input className="input-base" placeholder="예: 센서 입력과 PLC 기본 명령어" value={unit} onChange={(event) => setUnit(event.target.value)} disabled={isGenerating} />
          </label>

          <fieldset className="space-y-2">
            <legend className="field-label">분량</legend>
            <div className="grid grid-cols-3 gap-2">
              {subjectLengthOptions.map((option) => {
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
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Search size={18} className="text-blue-700" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-950">학생 필터</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">필터 결과는 아래 입력 테이블에 바로 표시됩니다.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="secondary-button" type="button" onClick={toggleFilteredStudents} disabled={filteredStudents.length === 0 || isGenerating}>
              <UsersRound size={17} aria-hidden="true" />
              {allFilteredSelected ? "필터 선택 해제" : "전체 선택"}
            </button>
            <button className="secondary-button" type="button" onClick={clearSelection} disabled={selectedStudents.length === 0 || isGenerating}>
              선택 초기화
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-2">
            <span className="field-label">학년</span>
            <select className="input-base" value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
              <option value="">전체</option>
              {gradeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="field-label">학과</span>
            <select className="input-base" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="">전체</option>
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="field-label">반</span>
            <select className="input-base" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">전체</option>
              {classOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">학생별 입력 테이블</h2>
            <p className="mt-1 text-sm text-slate-500">필터 결과 {filteredStudents.length}명 중 {selectedStudents.length}명을 선택했습니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="primary-button" type="button" onClick={generateSelectedStudents} disabled={!canGenerate}>
              {isGenerating ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
              선택 학생 생성
            </button>
            <button className="secondary-button" type="button" onClick={regenerateFailedStudents} disabled={failedStudents.length === 0 || isGenerating || !subjectName.trim()}>
              <RefreshCcw size={17} aria-hidden="true" />
              실패만 재생성
            </button>
            <button className="secondary-button" type="button" onClick={applyBulkInputToSelected} disabled={selectedStudents.length === 0 || isGenerating}>
              <Copy size={17} aria-hidden="true" />
              선택 학생에게 값 일괄 적용
            </button>
            <button className="secondary-button" type="button" onClick={copyPreviousValuesToSelected} disabled={selectedStudents.length === 0 || isGenerating}>
              <Copy size={17} aria-hidden="true" />
              이전 학생 값 복사
            </button>
          </div>
        </div>

        {!subjectName.trim() || selectedStudents.length === 0 ? (
          <div className="border-b border-slate-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">
            {!subjectName.trim() ? "과목명을 입력하세요. " : ""}
            {selectedStudents.length === 0 ? "생성할 학생을 선택하세요." : ""}
          </div>
        ) : null}

        {message ? <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">{message}</div> : null}

        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-[1320px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold uppercase tracking-normal text-slate-500 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className="w-16 px-4 py-3">선택</th>
                <th className="w-48 px-4 py-3">학생명</th>
                <th className="w-56 px-4 py-3">활동유형</th>
                <th className="w-56 px-4 py-3">역량키워드</th>
                <th className="w-48 px-4 py-3">보완점</th>
                <th className="w-[320px] px-4 py-3">교사 관찰 메모</th>
                <th className="w-28 px-4 py-3">상태</th>
                <th className="w-32 px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    <Loader2 className="mr-2 inline animate-spin" size={17} aria-hidden="true" />
                    학생 목록 로딩 중
                  </td>
                </tr>
              ) : null}
              {!isLoading && filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    조건에 맞는 학생이 없습니다.
                  </td>
                </tr>
              ) : null}
              {filteredStudents.map((student) => {
                const input = studentInputs[student.id] || makeInitialStudentInput();
                const statusMeta = getStatusMeta(input.status);
                const warnings = getStudentWarnings(input);
                const isRowGenerating = input.status === "generating" || input.status === "queued";
                const selected = selectedStudentIdSet.has(student.id);
                const rowReady = isStudentReady(input);

                return (
                  <tr key={student.id} className={`align-top ${selected ? "bg-blue-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={selected}
                        onChange={() => toggleStudent(student.id)}
                        disabled={isGenerating}
                        aria-label={`${student.name} 선택`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-950">
                        {student.className} {student.number}번 {student.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {student.grade} · {departmentLabel(student.department)}
                      </p>
                      {warnings.length > 0 ? (
                        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs font-semibold leading-5 text-amber-900">
                          <AlertTriangle className="mr-1 inline" size={13} aria-hidden="true" />
                          빈 값: {warnings.join(", ")}
                        </div>
                      ) : (
                        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="mr-1 inline" size={13} aria-hidden="true" />
                          생성 가능
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChipSelector
                        label="활동유형"
                        options={activityOptions}
                        values={input.activityTypes}
                        onChange={(values) => patchStudentInput(student.id, { activityTypes: values })}
                        disabled={isRowGenerating}
                        compact
                        showLabel={false}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ChipSelector
                        label="역량키워드"
                        options={competencyOptions}
                        values={input.competencies}
                        onChange={(values) => patchStudentInput(student.id, { competencies: values })}
                        disabled={isRowGenerating}
                        compact
                        showLabel={false}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ChipSelector
                        label="보완점"
                        options={settingsOptions.subjectImprovementOptions}
                        values={input.improvements}
                        onChange={(values) => patchStudentInput(student.id, { improvements: values })}
                        disabled={isRowGenerating}
                        compact
                        showLabel={false}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        className="input-base min-h-28 resize-y leading-6"
                        placeholder="학생별 관찰 내용을 입력하세요."
                        value={input.observationMemo}
                        onChange={(event) => patchStudentInput(student.id, { observationMemo: event.target.value })}
                        disabled={isRowGenerating}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-bold ${statusMeta.className}`}>
                        {input.status === "generating" ? <Loader2 className="mr-1 animate-spin" size={13} aria-hidden="true" /> : null}
                        {statusMeta.label}
                      </span>
                      {input.savedMessage ? <p className="mt-2 text-xs font-semibold text-emerald-700">{input.savedMessage}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-2">
                        <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={() => copyPreviousStudentValues(student.id)} disabled={isGenerating}>
                          <Copy size={15} aria-hidden="true" />
                          이전 복사
                        </button>
                        <button
                          className="secondary-button min-h-10 px-3 py-1.5"
                          type="button"
                          onClick={() => generateSingleStudent(student)}
                          disabled={isGenerating || !subjectName.trim() || !rowReady}
                        >
                          <Play size={15} aria-hidden="true" />
                          {input.status === "failed" ? "재생성" : "개별 생성"}
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
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-950">생성 결과</h2>
          <p className="mt-1 text-sm text-slate-500">학생별 생성 결과를 확인하고 복사하거나 실패한 학생만 다시 생성합니다.</p>
        </div>

        {selectedStudents.length === 0 ? (
          <div className="p-5 text-sm font-semibold text-slate-500">학생을 선택하면 생성 결과가 표시됩니다.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {selectedStudents.map((student) => {
              const input = studentInputs[student.id] || makeInitialStudentInput();
              const statusMeta = getStatusMeta(input.status);
              const hasDraft = Boolean(input.result?.draft);

              return (
                <article key={student.id} className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[220px_minmax(0,1fr)_140px]">
                  <div>
                    <p className="font-bold text-slate-950">
                      {student.className} {student.number}번 {student.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {student.grade} · {departmentLabel(student.department)}
                    </p>
                    <span className={`mt-3 inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-bold ${statusMeta.className}`}>{statusMeta.label}</span>
                  </div>

                  <div>
                    <div className={`min-h-28 rounded-md border p-3 text-sm leading-6 ${input.error ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                      {input.result?.draft || input.error || "아직 생성 결과가 없습니다."}
                    </div>
                    {input.result?.warnings && input.result.warnings.length > 0 ? (
                      <details className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        <summary className="cursor-pointer font-bold">확인 필요</summary>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {input.result.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    {input.savedMessage ? <p className="mt-2 text-xs font-semibold text-emerald-700">{input.savedMessage}</p> : null}
                  </div>

                  <div className="grid content-start gap-2">
                    <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={() => copyDraft(student.id)} disabled={!hasDraft}>
                      <Clipboard size={15} aria-hidden="true" />
                      복사
                    </button>
                    {input.status === "failed" ? (
                      <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={() => generateForStudents([student])} disabled={isGenerating || !subjectName.trim()}>
                        <Play size={15} aria-hidden="true" />
                        재생성
                      </button>
                    ) : null}
                  </div>
                </article>
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

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr_1.2fr]">
          <ChipSelector
            label="활동유형"
            options={activityOptions}
            values={bulkInput.activityTypes}
            onChange={(values) => updateBulkInput({ activityTypes: values })}
            disabled={isGenerating}
            compact
          />
          <ChipSelector
            label="역량 키워드"
            options={competencyOptions}
            values={bulkInput.competencies}
            onChange={(values) => updateBulkInput({ competencies: values })}
            disabled={isGenerating}
            compact
          />
          <ChipSelector
            label="보완점"
            options={settingsOptions.subjectImprovementOptions}
            values={bulkInput.improvements}
            onChange={(values) => updateBulkInput({ improvements: values })}
            disabled={isGenerating}
            compact
          />
          <label className="space-y-2">
            <span className="field-label">교사 관찰 메모</span>
            <textarea
              className="input-base min-h-24 resize-y leading-6"
              placeholder="여러 학생에게 공통으로 적용할 메모가 있을 때 입력하세요."
              value={bulkInput.observationMemo}
              onChange={(event) => updateBulkInput({ observationMemo: event.target.value })}
              disabled={isGenerating}
            />
          </label>
        </div>
      </details>
    </div>
  );
}
