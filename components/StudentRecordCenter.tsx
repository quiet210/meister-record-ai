"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  FileText,
  Loader2,
  Lock,
  RefreshCcw,
  Search,
  Unlock,
  X
} from "lucide-react";
import { getFallbackSettingsOptions, loadSettingsOptions, type SettingsOptions } from "@/lib/admin-settings";
import { postGenerateApi } from "@/lib/generate-api-client";
import {
  finalizeRecordDraft,
  getEffectiveRecordContent,
  getRecordDraftLifecycleStatusMeta,
  saveEditedRecordDraft,
  unfinalizeRecordDraft
} from "@/lib/record-drafts";
import { listStudentRecordDrafts, type StudentRecordDraft } from "@/lib/student-records";
import { ensureUserProfile, listStudents } from "@/lib/students";
import { gradeOptions } from "@/lib/options";
import type { CommentMode, GenerateResponse, Student } from "@/lib/types";

type ContentTab = "ai" | "edited" | "final";
type DraftByMode = Partial<Record<CommentMode, StudentRecordDraft>>;
type DraftHistoriesByMode = Record<CommentMode, StudentRecordDraft[]>;
type DraftIndexEntry = {
  latest: DraftByMode;
  histories: DraftHistoriesByMode;
};
type ActionState = "copy" | "regenerate" | "use-regenerated" | "finalize" | "unfinalize";

const fallbackSettingsOptions = getFallbackSettingsOptions();
const modeMeta: Record<CommentMode, { title: string; shortTitle: string; endpoint: string }> = {
  subject: {
    title: "과세특",
    shortTitle: "과세특",
    endpoint: "/api/generate/subject-comment"
  },
  behavior: {
    title: "행동특성 및 종합의견",
    shortTitle: "행특",
    endpoint: "/api/generate/behavior-comment"
  }
};

function sortClassNames(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "ko-KR", { numeric: true }));
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getTabContent(draft: StudentRecordDraft, tab: ContentTab) {
  if (tab === "final") return draft.finalContent || "";
  if (tab === "edited") return draft.editedContent || draft.aiContent || draft.draftText || "";
  return draft.aiContent || draft.draftText || "";
}

function getRecordKey(studentId: string, mode: CommentMode) {
  return `${studentId}:${mode}`;
}

function makeDraftIndexEntry(): DraftIndexEntry {
  return {
    latest: {},
    histories: {
      subject: [],
      behavior: []
    }
  };
}

function buildTimeline(history: StudentRecordDraft[]) {
  const events: Array<{ id: string; at: string; title: string; description: string }> = [];

  history.forEach((draft) => {
    events.push({
      id: `${draft.id}-created`,
      at: draft.createdAt,
      title: "AI 생성",
      description: draft.aiContent ? "AI 원본이 생성되었습니다." : "초안 row가 생성되었습니다."
    });

    if (draft.editedAt) {
      events.push({
        id: `${draft.id}-edited`,
        at: draft.editedAt,
        title: "수정 저장",
        description: draft.editedContent && draft.editedContent !== draft.aiContent ? "교사 수정본이 저장되었습니다." : "수정본 저장 시각이 기록되었습니다."
      });
    }

    if (draft.finalizedAt) {
      events.push({
        id: `${draft.id}-finalized`,
        at: draft.finalizedAt,
        title: "최종 확정",
        description: "최종본이 확정되었습니다."
      });
    }
  });

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function StudentRecordCenter() {
  const [settingsOptions, setSettingsOptions] = useState<SettingsOptions>(() => fallbackSettingsOptions);
  const [students, setStudents] = useState<Student[]>([]);
  const [drafts, setDrafts] = useState<StudentRecordDraft[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [activeTabs, setActiveTabs] = useState<Record<string, ContentTab>>({});
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [pendingRegenerations, setPendingRegenerations] = useState<Record<string, GenerateResponse | null>>({});
  const [actionStates, setActionStates] = useState<Record<string, ActionState | "">>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadPageData(preferredStudentId?: string) {
    setIsLoading(true);
    setLoadError("");

    const [settings, studentResult, draftResult, profileResult] = await Promise.all([
      loadSettingsOptions(),
      listStudents(),
      listStudentRecordDrafts(),
      ensureUserProfile()
    ]);

    setSettingsOptions(settings);
    setStudents(studentResult.students);
    setDrafts(draftResult.drafts);

    const errors = [studentResult.error, draftResult.error, profileResult.error].filter(Boolean);
    setLoadError(errors.join(" "));

    setSelectedStudentId((current) => {
      if (preferredStudentId && studentResult.students.some((student) => student.id === preferredStudentId)) return preferredStudentId;
      if (current && studentResult.students.some((student) => student.id === current)) return current;
      return studentResult.students[0]?.id || "";
    });
    setIsLoading(false);
  }

  useEffect(() => {
    void loadPageData();
    const handleStudentsChanged = () => void loadPageData();
    window.addEventListener("student-record-ai:students-changed", handleStudentsChanged);

    return () => {
      window.removeEventListener("student-record-ai:students-changed", handleStudentsChanged);
    };
  }, []);

  const departmentOptions = settingsOptions.departmentOptions;
  const departmentLabelMap = useMemo(() => new Map(departmentOptions.map((option) => [option.value, option.label])), [departmentOptions]);
  const departmentLabel = useCallback((value: string) => departmentLabelMap.get(value) || value, [departmentLabelMap]);

  const classOptions = useMemo(() => {
    const classes = students.map((student) => student.className).filter(Boolean);

    return sortClassNames(Array.from(new Set(classes)));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return students
      .filter((student) => !normalizedQuery || student.name.toLowerCase().includes(normalizedQuery))
      .filter((student) => !gradeFilter || student.grade === gradeFilter)
      .filter((student) => !departmentFilter || student.department === departmentFilter)
      .filter((student) => !classFilter || student.className === classFilter);
  }, [classFilter, departmentFilter, gradeFilter, query, students]);

  const draftIndex = useMemo(() => {
    const index = new Map<string, DraftIndexEntry>();

    drafts.forEach((draft) => {
      const entry = index.get(draft.studentId) || makeDraftIndexEntry();
      entry.histories[draft.mode].push(draft);
      if (!entry.latest[draft.mode]) {
        entry.latest[draft.mode] = draft;
      }
      index.set(draft.studentId, entry);
    });

    return index;
  }, [drafts]);

  const finalizedDraftCount = useMemo(() => drafts.filter((draft) => draft.status === "finalized").length, [drafts]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || filteredStudents[0] || students[0],
    [filteredStudents, selectedStudentId, students]
  );

  const selectedDraftEntry = useMemo(() => (selectedStudent ? draftIndex.get(selectedStudent.id) : undefined), [draftIndex, selectedStudent]);
  const selectedDrafts = useMemo<DraftByMode>(() => {
    return selectedDraftEntry?.latest || {};
  }, [selectedDraftEntry]);

  const selectedHistories = useMemo(() => {
    return selectedDraftEntry?.histories || makeDraftIndexEntry().histories;
  }, [selectedDraftEntry]);

  const selectStudent = useCallback((studentId: string) => {
    setSelectedStudentId(studentId);
  }, []);

  function setAction(key: string, state: ActionState | "") {
    setActionStates((current) => ({
      ...current,
      [key]: state
    }));
  }

  function setCardMessage(key: string, message: string) {
    setMessages((current) => ({
      ...current,
      [key]: message
    }));
  }

  async function copyDraft(studentId: string, mode: CommentMode, draft: StudentRecordDraft) {
    const key = getRecordKey(studentId, mode);
    const content = getEffectiveRecordContent({
      finalContent: draft.finalContent,
      editedContent: draft.editedContent,
      aiContent: draft.aiContent,
      draftText: draft.draftText
    });

    if (!content) return;

    setAction(key, "copy");
    await navigator.clipboard.writeText(content);
    setAction(key, "");
    setCardMessage(key, "최종본 선택 규칙에 따른 내용을 복사했습니다.");
  }

  async function regenerateDraft(studentId: string, mode: CommentMode, draft: StudentRecordDraft) {
    const key = getRecordKey(studentId, mode);
    if (!draft.inputPayload) {
      setCardMessage(key, "AI 다시 생성에 사용할 입력 payload가 없습니다.");
      return;
    }

    setAction(key, "regenerate");
    setCardMessage(key, "");

    try {
      const response = await postGenerateApi(modeMeta[mode].endpoint, draft.inputPayload);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `생성 API 오류: ${response.status}`);
      }

      const result = (await response.json()) as GenerateResponse;
      if (!result.draft) {
        throw new Error(result.warnings?.join(" ") || "새 AI 결과를 생성하지 못했습니다.");
      }

      setPendingRegenerations((current) => ({
        ...current,
        [key]: result
      }));
      setCardMessage(key, "새 AI 결과가 생성되었습니다. 현재 유지 또는 새 결과 사용을 선택하세요.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 다시 생성 중 오류가 발생했습니다.";
      setCardMessage(key, message);
    } finally {
      setAction(key, "");
    }
  }

  function keepCurrentDraft(studentId: string, mode: CommentMode) {
    const key = getRecordKey(studentId, mode);
    setPendingRegenerations((current) => ({
      ...current,
      [key]: null
    }));
    setCardMessage(key, "현재 수정본을 유지했습니다.");
  }

  async function useRegeneratedDraft(studentId: string, mode: CommentMode, draft: StudentRecordDraft) {
    const key = getRecordKey(studentId, mode);
    const pendingResult = pendingRegenerations[key];
    if (!pendingResult?.draft || !draft.inputPayload) return;

    setAction(key, "use-regenerated");
    const saveResult = await saveEditedRecordDraft({
      mode,
      studentId,
      payload: draft.inputPayload,
      result: pendingResult,
      aiContent: draft.aiContent || draft.draftText || pendingResult.draft,
      editedContent: pendingResult.draft,
      status: "saved"
    });

    setAction(key, "");
    if (saveResult.error) {
      setCardMessage(key, `새 결과 저장 실패: ${saveResult.error}`);
      return;
    }

    setPendingRegenerations((current) => ({
      ...current,
      [key]: null
    }));
    setCardMessage(key, "새 AI 결과를 수정본으로 저장했습니다.");
    await loadPageData(studentId);
  }

  async function finalizeDraft(studentId: string, mode: CommentMode, draft: StudentRecordDraft) {
    const key = getRecordKey(studentId, mode);
    const finalContent = getEffectiveRecordContent({
      finalContent: draft.finalContent,
      editedContent: draft.editedContent,
      aiContent: draft.aiContent,
      draftText: draft.draftText
    });

    if (!draft.inputPayload || !finalContent) return;

    setAction(key, "finalize");
    const saveResult = await finalizeRecordDraft({
      mode,
      studentId,
      payload: draft.inputPayload,
      result: draft.resultPayload,
      aiContent: draft.aiContent || draft.draftText || finalContent,
      editedContent: draft.editedContent || finalContent,
      finalContent
    });

    setAction(key, "");
    if (saveResult.error) {
      setCardMessage(key, `최종 확정 실패: ${saveResult.error}`);
      return;
    }

    setCardMessage(key, "최종본을 확정했습니다.");
    await loadPageData(studentId);
  }

  async function unfinalizeDraft(studentId: string, mode: CommentMode, draft: StudentRecordDraft) {
    const key = getRecordKey(studentId, mode);
    const editedContent = draft.editedContent || draft.finalContent || draft.aiContent || draft.draftText;

    if (!draft.inputPayload || !editedContent) return;

    setAction(key, "unfinalize");
    const saveResult = await unfinalizeRecordDraft({
      mode,
      studentId,
      payload: draft.inputPayload,
      result: draft.resultPayload,
      aiContent: draft.aiContent || draft.draftText || editedContent,
      editedContent
    });

    setAction(key, "");
    if (saveResult.error) {
      setCardMessage(key, `최종 해제 실패: ${saveResult.error}`);
      return;
    }

    setCardMessage(key, "최종 확정을 해제했습니다.");
    await loadPageData(studentId);
  }

  return (
    <div className="min-w-0 space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Student Record Center</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-950">학생별 학생부 관리</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            학생 한 명을 선택해 과세특과 행특의 AI 원본, 수정본, 최종본, 생성 이력을 한 화면에서 확인합니다.
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 rounded-md border border-slate-200 bg-white p-3 text-center shadow-sm sm:w-auto">
          <div>
            <p className="text-xs font-semibold text-slate-500">학생</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{students.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">기록</p>
            <p className="mt-1 text-sm font-bold text-blue-700">{drafts.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">최종</p>
            <p className="mt-1 text-sm font-bold text-emerald-700">{finalizedDraftCount}</p>
          </div>
        </div>
      </section>

      {loadError ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{loadError}</div> : null}

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="panel min-w-0 overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-blue-700" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-950">학생 목록</h2>
            </div>
            <div className="mt-4 space-y-3">
              <label className="space-y-2">
                <span className="field-label">이름 검색</span>
                <input className="input-base" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="학생 이름" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
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
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-2">
            {isLoading ? (
              <div className="p-6 text-center text-sm font-semibold text-slate-500">
                <Loader2 className="mr-2 inline animate-spin" size={17} aria-hidden="true" />
                학생부 데이터 로딩 중
              </div>
            ) : null}
            {!isLoading && filteredStudents.length === 0 ? <div className="p-6 text-center text-sm font-semibold text-slate-500">조건에 맞는 학생이 없습니다.</div> : null}
            {filteredStudents.map((student) => {
              const selected = selectedStudent?.id === student.id;
              const latestDrafts = draftIndex.get(student.id)?.latest;

              return (
                <StudentRecordListItem
                  key={student.id}
                  student={student}
                  selected={selected}
                  departmentName={departmentLabel(student.department)}
                  subjectStatus={latestDrafts?.subject?.status}
                  behaviorStatus={latestDrafts?.behavior?.status}
                  onSelect={selectStudent}
                />
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          {!selectedStudent ? (
            <div className="panel p-8 text-center text-sm font-semibold text-slate-500">학생을 선택하면 상세 학생부가 표시됩니다.</div>
          ) : (
            <>
              <div className="panel p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-700">선택 학생</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-950">
                      {selectedStudent.className} {selectedStudent.number}번 {selectedStudent.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedStudent.grade} · {departmentLabel(selectedStudent.department)}
                    </p>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => void loadPageData(selectedStudent.id)} disabled={isLoading}>
                    <RefreshCcw size={17} aria-hidden="true" />
                    새로고침
                  </button>
                </div>
              </div>

              <RecordModeCard
                student={selectedStudent}
                mode="subject"
                draft={selectedDrafts.subject}
                history={selectedHistories.subject}
                activeTab={activeTabs[getRecordKey(selectedStudent.id, "subject")] || "final"}
                expanded={openCards[getRecordKey(selectedStudent.id, "subject")] ?? true}
                pendingRegeneration={pendingRegenerations[getRecordKey(selectedStudent.id, "subject")] || null}
                actionState={actionStates[getRecordKey(selectedStudent.id, "subject")] || ""}
                message={messages[getRecordKey(selectedStudent.id, "subject")] || ""}
                onSetTab={(tab) => setActiveTabs((current) => ({ ...current, [getRecordKey(selectedStudent.id, "subject")]: tab }))}
                onToggleOpen={() => setOpenCards((current) => ({ ...current, [getRecordKey(selectedStudent.id, "subject")]: !(current[getRecordKey(selectedStudent.id, "subject")] ?? true) }))}
                onCopy={(draft) => void copyDraft(selectedStudent.id, "subject", draft)}
                onRegenerate={(draft) => void regenerateDraft(selectedStudent.id, "subject", draft)}
                onKeepCurrent={() => keepCurrentDraft(selectedStudent.id, "subject")}
                onUseRegenerated={(draft) => void useRegeneratedDraft(selectedStudent.id, "subject", draft)}
                onFinalize={(draft) => void finalizeDraft(selectedStudent.id, "subject", draft)}
                onUnfinalize={(draft) => void unfinalizeDraft(selectedStudent.id, "subject", draft)}
              />

              <RecordModeCard
                student={selectedStudent}
                mode="behavior"
                draft={selectedDrafts.behavior}
                history={selectedHistories.behavior}
                activeTab={activeTabs[getRecordKey(selectedStudent.id, "behavior")] || "final"}
                expanded={openCards[getRecordKey(selectedStudent.id, "behavior")] ?? true}
                pendingRegeneration={pendingRegenerations[getRecordKey(selectedStudent.id, "behavior")] || null}
                actionState={actionStates[getRecordKey(selectedStudent.id, "behavior")] || ""}
                message={messages[getRecordKey(selectedStudent.id, "behavior")] || ""}
                onSetTab={(tab) => setActiveTabs((current) => ({ ...current, [getRecordKey(selectedStudent.id, "behavior")]: tab }))}
                onToggleOpen={() => setOpenCards((current) => ({ ...current, [getRecordKey(selectedStudent.id, "behavior")]: !(current[getRecordKey(selectedStudent.id, "behavior")] ?? true) }))}
                onCopy={(draft) => void copyDraft(selectedStudent.id, "behavior", draft)}
                onRegenerate={(draft) => void regenerateDraft(selectedStudent.id, "behavior", draft)}
                onKeepCurrent={() => keepCurrentDraft(selectedStudent.id, "behavior")}
                onUseRegenerated={(draft) => void useRegeneratedDraft(selectedStudent.id, "behavior", draft)}
                onFinalize={(draft) => void finalizeDraft(selectedStudent.id, "behavior", draft)}
                onUnfinalize={(draft) => void unfinalizeDraft(selectedStudent.id, "behavior", draft)}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

type StudentRecordListItemProps = {
  student: Student;
  selected: boolean;
  departmentName: string;
  subjectStatus?: string;
  behaviorStatus?: string;
  onSelect: (studentId: string) => void;
};

const StudentRecordListItem = memo(function StudentRecordListItem({
  student,
  selected,
  departmentName,
  subjectStatus,
  behaviorStatus,
  onSelect
}: StudentRecordListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(student.id)}
      className={`mb-2 w-full rounded-md border p-3 text-left transition ${
        selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
      }`}
    >
      <p className="font-bold text-slate-950">
        {student.className} {student.number}번 {student.name}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {student.grade} · {departmentName}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <MiniStatusBadge label="과세특" status={subjectStatus} />
        <MiniStatusBadge label="행특" status={behaviorStatus} />
      </div>
    </button>
  );
});

function MiniStatusBadge({ label, status }: { label: string; status?: string }) {
  const normalizedStatus = status === "editing" || status === "saved" || status === "finalized" ? status : "ai_generated";
  const meta = getRecordDraftLifecycleStatusMeta(normalizedStatus);

  return (
    <span className={`inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-bold ${status ? meta.className : "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {status ? meta.label : `${label} 없음`}
    </span>
  );
}

type RecordModeCardProps = {
  student: Student;
  mode: CommentMode;
  draft?: StudentRecordDraft;
  history: StudentRecordDraft[];
  activeTab: ContentTab;
  expanded: boolean;
  pendingRegeneration: GenerateResponse | null;
  actionState: ActionState | "";
  message: string;
  onSetTab: (tab: ContentTab) => void;
  onToggleOpen: () => void;
  onCopy: (draft: StudentRecordDraft) => void;
  onRegenerate: (draft: StudentRecordDraft) => void;
  onKeepCurrent: () => void;
  onUseRegenerated: (draft: StudentRecordDraft) => void;
  onFinalize: (draft: StudentRecordDraft) => void;
  onUnfinalize: (draft: StudentRecordDraft) => void;
};

function RecordModeCard({
  mode,
  draft,
  history,
  activeTab,
  expanded,
  pendingRegeneration,
  actionState,
  message,
  onSetTab,
  onToggleOpen,
  onCopy,
  onRegenerate,
  onKeepCurrent,
  onUseRegenerated,
  onFinalize,
  onUnfinalize
}: RecordModeCardProps) {
  const modeInfo = modeMeta[mode];
  const statusMeta = getRecordDraftLifecycleStatusMeta(draft?.status || "ai_generated");
  const effectiveContent = draft
    ? getEffectiveRecordContent({
        finalContent: draft.finalContent,
        editedContent: draft.editedContent,
        aiContent: draft.aiContent,
        draftText: draft.draftText
      })
    : "";
  const activeContent = draft ? getTabContent(draft, activeTab) : "";
  const timeline = useMemo(() => buildTimeline(history), [history]);
  const isFinalized = draft?.status === "finalized";
  const canRegenerate = Boolean(draft?.inputPayload && !isFinalized);
  const canFinalize = Boolean(draft?.inputPayload && effectiveContent && !isFinalized);
  const canUnfinalize = Boolean(draft?.inputPayload && isFinalized);

  return (
    <article className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={19} className="text-blue-700" aria-hidden="true" />
            <h3 className="text-xl font-bold text-slate-950">{modeInfo.title}</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-bold ${statusMeta.className}`}>
              <span className={`mr-1 h-2 w-2 rounded-full ${statusMeta.dotClassName}`} aria-hidden="true" />
              현재 상태 {draft ? statusMeta.label : "기록 없음"}
            </span>
            <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
              AI 생성 {draft?.aiContent ? "있음" : "없음"}
            </span>
            <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
              수정본 {draft?.editedContent ? "있음" : "없음"}
            </span>
            <span className="inline-flex min-h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
              최종본 {draft?.finalContent ? "있음" : "없음"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
            <p>생성일: {formatDateTime(draft?.createdAt || "")}</p>
            <p>최종 수정일: {formatDateTime(draft?.updatedAt || draft?.editedAt || "")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={onToggleOpen} disabled={!draft}>
            열기
          </button>
          <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={() => draft && onCopy(draft)} disabled={!draft || !effectiveContent || actionState === "copy"}>
            {actionState === "copy" ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Clipboard size={15} aria-hidden="true" />}
            복사
          </button>
          <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={() => draft && onRegenerate(draft)} disabled={!draft || !canRegenerate || actionState === "regenerate"}>
            {actionState === "regenerate" ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <RefreshCcw size={15} aria-hidden="true" />}
            AI 다시 생성
          </button>
          {isFinalized ? (
            <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={() => draft && onUnfinalize(draft)} disabled={!canUnfinalize || actionState === "unfinalize"}>
              {actionState === "unfinalize" ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Unlock size={15} aria-hidden="true" />}
              최종 해제
            </button>
          ) : (
            <button className="primary-button min-h-10 px-3 py-1.5" type="button" onClick={() => draft && onFinalize(draft)} disabled={!canFinalize || actionState === "finalize"}>
              {actionState === "finalize" ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
              최종 확정
            </button>
          )}
        </div>
      </div>

      {!draft ? (
        <div className="p-5 text-sm font-semibold text-slate-500">{modeInfo.shortTitle} 기록이 없습니다. 생성 화면에서 초안을 먼저 생성하세요.</div>
      ) : null}

      {draft && expanded ? (
        <div className="grid grid-cols-1 gap-5 p-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {[
                ["ai", "AI 원본"],
                ["edited", "수정본"],
                ["final", "최종본"]
              ].map(([tab, label]) => {
                const selected = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onSetTab(tab as ContentTab)}
                    className={`min-h-9 rounded-md border px-3 py-1.5 text-sm font-bold transition ${
                      selected ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 min-h-52 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800">
              {activeContent || `${activeTab === "final" ? "최종본" : activeTab === "edited" ? "수정본" : "AI 원본"}이 없습니다.`}
            </div>

            {pendingRegeneration?.draft ? (
              <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-bold text-blue-900">새 AI 결과</p>
                <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-white p-3 text-sm leading-6 text-slate-800">{pendingRegeneration.draft}</div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={onKeepCurrent}>
                    <X size={15} aria-hidden="true" />
                    현재 유지
                  </button>
                  <button className="primary-button min-h-10 px-3 py-1.5" type="button" onClick={() => onUseRegenerated(draft)} disabled={actionState === "use-regenerated"}>
                    {actionState === "use-regenerated" ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                    새 결과 사용
                  </button>
                </div>
              </div>
            ) : null}

            {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
          </div>

          <aside className="rounded-md border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-bold text-slate-950">생성 이력</h4>
            {timeline.length === 0 ? <p className="mt-3 text-sm font-semibold text-slate-500">표시할 이력이 없습니다.</p> : null}
            <ol className="mt-4 space-y-3">
              {timeline.map((event) => (
                <li key={event.id} className="relative border-l border-slate-200 pl-4">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden="true" />
                  <p className="text-xs font-semibold text-slate-500">{formatDateTime(event.at)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">{event.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{event.description}</p>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      ) : null}
    </article>
  );
}
