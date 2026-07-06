"use client";

import { useEffect, useMemo, useState } from "react";
import { gradeOptions } from "@/lib/options";
import { getFallbackSettingsOptions, loadSettingsOptions, type SettingsOptions } from "@/lib/admin-settings";
import { postGenerateApi } from "@/lib/generate-api-client";
import { finalizeRecordDraft, getEffectiveRecordContent, saveEditedRecordDraft, saveRecordDraft, unfinalizeRecordDraft } from "@/lib/record-drafts";
import { ensureUserProfile, listStudents } from "@/lib/students";
import type { CurriculumStandard, CurriculumSubjectType } from "@/lib/curriculum";
import type { CommentLength, CommentMode, Department, GenerateResponse, RecordDraftLifecycleStatus, RecordFormPayload, Student } from "@/lib/types";
import { DesktopRecordComposer } from "@/components/DesktopRecordComposer";
import { MobileRecordStepper } from "@/components/MobileRecordStepper";
import { useSubjectLearningModule } from "@/components/useSubjectLearningModule";

type RecordComposerProps = {
  mode: CommentMode;
};

type RecordComposerConfig = {
  title: string;
  description: string;
  buttonLabel: string;
  endpoint: string;
};

const fallbackSettingsOptions = getFallbackSettingsOptions();

export type RecordComposerViewProps = {
  mode: CommentMode;
  config: RecordComposerConfig;
  settingsOptions: SettingsOptions;
  students: Student[];
  selectedStudentId: string;
  selectedStudent?: Student;
  grade: (typeof gradeOptions)[number];
  department: Department;
  className: string;
  subjectName: string;
  subjectType: CurriculumSubjectType;
  subjectTypeLabel: string;
  learningModule: string;
  learningModuleOptions: string[];
  learningModuleUnitOptions: string[];
  learningModulePreviewStandards: CurriculumStandard[];
  isLearningModuleLoading: boolean;
  learningModuleError: string;
  textbook: string;
  unit: string;
  activityTypes: string[];
  competencies: string[];
  improvements: string[];
  observationMemo: string;
  schoolLifeAreas: string[];
  industrialAttitudes: string[];
  behaviorImprovements: string[];
  homeroomMemo: string;
  lengthOption: CommentLength;
  result: GenerateResponse | null;
  aiContent: string;
  editedContent: string;
  finalContent: string;
  lifecycleStatus: RecordDraftLifecycleStatus;
  pendingRegeneration: GenerateResponse | null;
  showCompare: boolean;
  isLoading: boolean;
  isSavingDraft: boolean;
  isRegenerating: boolean;
  savedMessage: string;
  activeMemo: string;
  memoLength: number;
  canGenerate: boolean;
  handleStudentChange: (studentId: string) => void;
  setGrade: (grade: (typeof gradeOptions)[number]) => void;
  setDepartment: (department: Department) => void;
  setClassName: (className: string) => void;
  setSubjectName: (subjectName: string) => void;
  setLearningModule: (learningModule: string) => void;
  setTextbook: (textbook: string) => void;
  setUnit: (unit: string) => void;
  setActivityTypes: (values: string[]) => void;
  setCompetencies: (values: string[]) => void;
  setImprovements: (values: string[]) => void;
  setObservationMemo: (memo: string) => void;
  setSchoolLifeAreas: (values: string[]) => void;
  setIndustrialAttitudes: (values: string[]) => void;
  setBehaviorImprovements: (values: string[]) => void;
  setHomeroomMemo: (memo: string) => void;
  setLengthOption: (option: CommentLength) => void;
  setEditedContent: (content: string) => void;
  generateDraft: () => Promise<void>;
  regenerateDraft: () => Promise<void>;
  keepCurrentDraft: () => void;
  useRegeneratedDraft: () => Promise<void>;
  copyDraft: () => Promise<void>;
  saveDraft: () => Promise<void>;
  toggleCompare: () => void;
  finalizeDraft: () => Promise<void>;
  unfinalizeDraft: () => Promise<void>;
  resetInputs: () => void;
};

function modeConfig(mode: CommentMode): RecordComposerConfig {
  if (mode === "subject") {
    return {
      title: "과세특 작성",
      description: "과목, 단원, 활동 내용, 교사 관찰 메모를 바탕으로 교과 세부능력 및 특기사항 초안을 생성합니다.",
      buttonLabel: "과세특 생성",
      endpoint: "/api/generate/subject-comment"
    };
  }

  return {
    title: "행동특성 작성",
    description: "학생의 학교생활 전반, 학급생활, 교우관계, 책임감, 성실성, 진로태도, 안전의식과 직업윤리 중심으로 초안을 생성합니다.",
    buttonLabel: "행동특성 생성",
    endpoint: "/api/generate/behavior-comment"
  };
}

export function RecordComposer({ mode }: RecordComposerProps) {
  const config = modeConfig(mode);
  const [settingsOptions, setSettingsOptions] = useState<SettingsOptions>(() => fallbackSettingsOptions);
  const [schoolId, setSchoolId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [grade, setGrade] = useState<(typeof gradeOptions)[number]>("1학년");
  const [department, setDepartment] = useState<Department>("materials");
  const [className, setClassName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [textbook, setTextbook] = useState("");
  const [unit, setUnit] = useState("");
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [observationMemo, setObservationMemo] = useState("");
  const [schoolLifeAreas, setSchoolLifeAreas] = useState<string[]>([]);
  const [industrialAttitudes, setIndustrialAttitudes] = useState<string[]>([]);
  const [behaviorImprovements, setBehaviorImprovements] = useState<string[]>([]);
  const [homeroomMemo, setHomeroomMemo] = useState("");
  const [lengthOption, setLengthOption] = useState<CommentLength>("medium");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [draftId, setDraftId] = useState("");
  const [aiContent, setAiContent] = useState("");
  const [editedContent, setEditedContentState] = useState("");
  const [finalContent, setFinalContent] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState<RecordDraftLifecycleStatus>("ai_generated");
  const [lastSavedEditedContent, setLastSavedEditedContent] = useState("");
  const [pendingRegeneration, setPendingRegeneration] = useState<GenerateResponse | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const subjectLearningModule = useSubjectLearningModule({
    enabled: mode === "subject",
    subjectName,
    curriculumSubjects: settingsOptions.curriculumSubjects,
    setUnit
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const options = await loadSettingsOptions();
      if (!isMounted) return;

      setSettingsOptions(options);
      setDepartment((current) => {
        if (options.departmentOptions.some((option) => option.value === current)) return current;
        return options.departmentOptions[0]?.value || current;
      });
    }

    async function loadStudents() {
      const result = await listStudents();
      if (!isMounted) return;

      setStudents(result.students);
      if (result.students[0]) {
        setSelectedStudentId((current) => current || result.students[0].id);
        setGrade(result.students[0].grade);
        setDepartment(result.students[0].department);
        setClassName(result.students[0].className);
      }
    }

    async function loadProfile() {
      const result = await ensureUserProfile();
      if (!isMounted || !result.profile) return;
      setSchoolId(result.profile.school_id);
    }

    loadSettings();
    loadStudents();
    loadProfile();
    window.addEventListener("student-record-ai:students-changed", loadStudents);

    return () => {
      isMounted = false;
      window.removeEventListener("student-record-ai:students-changed", loadStudents);
    };
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId),
    [selectedStudentId, students]
  );

  function handleStudentChange(studentId: string) {
    setSelectedStudentId(studentId);
    const student = students.find((item) => item.id === studentId);
    if (student) {
      setGrade(student.grade);
      setDepartment(student.department);
      setClassName(student.className);
    }
  }

  function buildPayload(): RecordFormPayload {
    if (mode === "behavior") {
      return {
        mode: "behavior",
        studentName: selectedStudent?.name,
        grade,
        department,
        className,
        schoolLifeAreas,
        industrialAttitudes,
        behaviorImprovements,
        homeroomMemo,
        lengthOption
      };
    }

    return {
      mode: "subject",
      schoolId,
      selectedStudentId,
      studentNo: selectedStudent?.number,
      studentName: selectedStudent?.name,
      grade,
      department,
      subjectName,
      learningModule: subjectLearningModule.learningModule,
      textbook,
      unit,
      activityTypes,
      competencies,
      improvements,
      observationMemo
    };
  }

  function resetInputs() {
    if (mode === "subject") {
      setTextbook("");
      subjectLearningModule.setLearningModule("");
      setUnit("");
      setActivityTypes([]);
      setCompetencies([]);
      setImprovements([]);
      setObservationMemo("");
    } else {
      setSchoolLifeAreas([]);
      setIndustrialAttitudes([]);
      setBehaviorImprovements([]);
      setHomeroomMemo("");
      setLengthOption("medium");
    }

    setResult(null);
    setDraftId("");
    setAiContent("");
    setEditedContentState("");
    setFinalContent("");
    setLifecycleStatus("ai_generated");
    setLastSavedEditedContent("");
    setPendingRegeneration(null);
    setShowCompare(false);
    setSavedMessage("");
  }

  function setEditedContent(content: string) {
    setEditedContentState(content);
    setPendingRegeneration(null);
    setSavedMessage("");
    setLifecycleStatus(content === lastSavedEditedContent ? "saved" : "editing");
  }

  async function generateDraft() {
    setIsLoading(true);
    setSavedMessage("");
    setResult(null);
    setDraftId("");
    setAiContent("");
    setEditedContentState("");
    setFinalContent("");
    setPendingRegeneration(null);
    setShowCompare(false);
    setLifecycleStatus("ai_generated");
    setLastSavedEditedContent("");

    try {
      const response = await postGenerateApi(config.endpoint, buildPayload());

      const data = (await response.json()) as GenerateResponse;
      setResult(data);
      if (data.draft) {
        setAiContent(data.draft);
        setEditedContentState(data.draft);
        setFinalContent("");
        setLifecycleStatus("ai_generated");

        const saveResult = await saveRecordDraft({
          mode,
          studentId: selectedStudent?.id,
          payload: buildPayload(),
          result: data
        });

        if (saveResult.error) {
          setSavedMessage(`AI 원본 저장 실패: ${saveResult.error}`);
        } else {
          setDraftId(saveResult.id || "");
          setLastSavedEditedContent(data.draft);
          setSavedMessage("AI 원본을 record_drafts에 저장했습니다.");
        }
      }
    } catch {
      setResult({
        draft: "",
        evidence: [],
        warnings: ["생성 요청 중 오류가 발생했습니다. 네트워크 상태를 확인하세요."]
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function regenerateDraft() {
    if (!canGenerate) return;
    setIsRegenerating(true);
    setSavedMessage("");

    try {
      const response = await postGenerateApi(config.endpoint, buildPayload());

      const data = (await response.json()) as GenerateResponse;
      if (!data.draft) {
        setSavedMessage(data.warnings?.join(" ") || "새 AI 결과를 생성하지 못했습니다.");
        return;
      }

      setPendingRegeneration(data);
      setSavedMessage("새 AI 결과가 생성되었습니다. 현재 유지 또는 새 결과 사용을 선택하세요.");
    } catch {
      setSavedMessage("AI 다시 생성 중 오류가 발생했습니다. 네트워크 상태를 확인하세요.");
    } finally {
      setIsRegenerating(false);
    }
  }

  function keepCurrentDraft() {
    setPendingRegeneration(null);
    setSavedMessage("현재 수정본을 유지했습니다.");
  }

  async function useRegeneratedDraft() {
    if (!pendingRegeneration?.draft) return;

    const nextAiContent = aiContent || pendingRegeneration.draft;
    const nextEditedContent = pendingRegeneration.draft;
    setResult(pendingRegeneration);
    setAiContent(nextAiContent);
    setEditedContentState(nextEditedContent);
    setFinalContent("");
    setPendingRegeneration(null);
    setLifecycleStatus("saved");
    setIsSavingDraft(true);

    const saveResult = await saveEditedRecordDraft({
      mode,
      studentId: selectedStudent?.id,
      draftId,
      payload: buildPayload(),
      result: pendingRegeneration,
      aiContent: nextAiContent,
      editedContent: nextEditedContent,
      status: "saved",
      allowFinalizedUpdate: true
    });

    setIsSavingDraft(false);
    if (saveResult.error) {
      setLifecycleStatus("editing");
      setSavedMessage(`새 결과 저장 실패: ${saveResult.error}`);
      return;
    }

    setDraftId(saveResult.id || draftId);
    setLastSavedEditedContent(nextEditedContent);
    setSavedMessage("새 AI 결과를 교사 수정본으로 저장했습니다.");
  }

  async function copyDraft() {
    const content = getEffectiveRecordContent({
      finalContent,
      editedContent,
      aiContent,
      draftText: result?.draft
    });
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setSavedMessage("최종본 선택 규칙에 따른 내용을 클립보드에 복사했습니다.");
  }

  async function saveDraft(source: "manual" | "auto" = "manual") {
    const content = editedContent || aiContent || result?.draft || "";
    if (!content || lifecycleStatus === "finalized") return;
    setIsSavingDraft(true);

    const saveResult = await saveEditedRecordDraft({
      mode,
      studentId: selectedStudent?.id,
      draftId,
      payload: buildPayload(),
      result,
      aiContent: aiContent || result?.draft || content,
      editedContent: content,
      status: "saved"
    });

    setIsSavingDraft(false);
    if (saveResult.error) {
      setSavedMessage(`저장 실패: ${saveResult.error}`);
      return;
    }

    setDraftId(saveResult.id || draftId);
    setLifecycleStatus("saved");
    setLastSavedEditedContent(content);
    setSavedMessage(source === "auto" ? "3초 자동 저장 완료" : "교사 수정본을 저장했습니다.");
  }

  function toggleCompare() {
    setShowCompare((current) => !current);
  }

  async function finalizeDraft() {
    const content = getEffectiveRecordContent({
      finalContent,
      editedContent,
      aiContent,
      draftText: result?.draft
    });
    if (!content) return;
    setIsSavingDraft(true);

    const saveResult = await finalizeRecordDraft({
      mode,
      studentId: selectedStudent?.id,
      draftId,
      payload: buildPayload(),
      result,
      aiContent: aiContent || result?.draft || content,
      editedContent: editedContent || content,
      finalContent: content
    });

    setIsSavingDraft(false);
    if (saveResult.error) {
      setSavedMessage(`최종 확정 실패: ${saveResult.error}`);
      return;
    }

    setDraftId(saveResult.id || draftId);
    setFinalContent(content);
    setEditedContentState(editedContent || content);
    setLifecycleStatus("finalized");
    setLastSavedEditedContent(editedContent || content);
    setSavedMessage("최종본을 확정했습니다.");
  }

  async function unfinalizeDraft() {
    const content = editedContent || finalContent || aiContent || result?.draft || "";
    if (!content) return;
    setIsSavingDraft(true);

    const saveResult = await unfinalizeRecordDraft({
      mode,
      studentId: selectedStudent?.id,
      draftId,
      payload: buildPayload(),
      result,
      aiContent: aiContent || result?.draft || content,
      editedContent: content
    });

    setIsSavingDraft(false);
    if (saveResult.error) {
      setSavedMessage(`최종 해제 실패: ${saveResult.error}`);
      return;
    }

    setDraftId(saveResult.id || draftId);
    setFinalContent("");
    setEditedContentState(content);
    setLifecycleStatus("saved");
    setLastSavedEditedContent(content);
    setSavedMessage("최종 확정을 해제했습니다.");
  }

  const activeMemo = mode === "subject" ? observationMemo : homeroomMemo;
  const memoLength = activeMemo.trim().length;
  const hasSubjectGenerationInput =
    observationMemo.trim().length > 0 || activityTypes.length > 0 || competencies.length > 0 || improvements.length > 0;
  const hasBehaviorGenerationInput =
    homeroomMemo.trim().length > 0 || schoolLifeAreas.length > 0 || industrialAttitudes.length > 0 || behaviorImprovements.length > 0;
  const canGenerate =
    mode === "subject"
      ? subjectName.trim().length > 0 && hasSubjectGenerationInput
      : className.trim().length > 0 && hasBehaviorGenerationInput;
  const viewSettingsOptions = settingsOptions || fallbackSettingsOptions;

  useEffect(() => {
    if (!editedContent || lifecycleStatus === "finalized" || editedContent === lastSavedEditedContent || isSavingDraft) return;

    const timer = window.setTimeout(() => {
      void saveDraft("auto");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [editedContent, lifecycleStatus, lastSavedEditedContent, isSavingDraft]);

  const viewProps: RecordComposerViewProps = {
    mode,
    config,
    settingsOptions: viewSettingsOptions,
    students,
    selectedStudentId,
    selectedStudent,
    grade,
    department,
    className,
    subjectName,
    subjectType: subjectLearningModule.selectedSubjectType,
    subjectTypeLabel: subjectLearningModule.selectedSubjectTypeLabel,
    learningModule: subjectLearningModule.learningModule,
    learningModuleOptions: subjectLearningModule.learningModuleOptions,
    learningModuleUnitOptions: subjectLearningModule.unitOptions,
    learningModulePreviewStandards: subjectLearningModule.previewStandards,
    isLearningModuleLoading: subjectLearningModule.isLearningModuleLoading,
    learningModuleError: subjectLearningModule.learningModuleError,
    textbook,
    unit,
    activityTypes,
    competencies,
    improvements,
    observationMemo,
    schoolLifeAreas,
    industrialAttitudes,
    behaviorImprovements,
    homeroomMemo,
    lengthOption,
    result,
    aiContent,
    editedContent,
    finalContent,
    lifecycleStatus,
    pendingRegeneration,
    showCompare,
    isLoading,
    isSavingDraft,
    isRegenerating,
    savedMessage,
    activeMemo,
    memoLength,
    canGenerate,
    handleStudentChange,
    setGrade,
    setDepartment,
    setClassName,
    setSubjectName,
    setLearningModule: subjectLearningModule.setLearningModule,
    setTextbook,
    setUnit,
    setActivityTypes,
    setCompetencies,
    setImprovements,
    setObservationMemo,
    setSchoolLifeAreas,
    setIndustrialAttitudes,
    setBehaviorImprovements,
    setHomeroomMemo,
    setLengthOption,
    setEditedContent,
    generateDraft,
    regenerateDraft,
    keepCurrentDraft,
    useRegeneratedDraft,
    copyDraft,
    saveDraft,
    toggleCompare,
    finalizeDraft,
    unfinalizeDraft,
    resetInputs
  };

  return (
    <>
      <MobileRecordStepper {...viewProps} />
      <DesktopRecordComposer {...viewProps} />
    </>
  );
}
