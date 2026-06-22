"use client";

import { useEffect, useMemo, useState } from "react";
import { gradeOptions } from "@/lib/options";
import { saveRecordDraft } from "@/lib/record-drafts";
import { listStudents } from "@/lib/students";
import type { CommentLength, CommentMode, Department, GenerateResponse, RecordFormPayload, Student } from "@/lib/types";
import { DesktopRecordComposer } from "@/components/DesktopRecordComposer";
import { MobileRecordStepper } from "@/components/MobileRecordStepper";

type RecordComposerProps = {
  mode: CommentMode;
};

type RecordComposerConfig = {
  title: string;
  description: string;
  buttonLabel: string;
  endpoint: string;
};

export type RecordComposerViewProps = {
  mode: CommentMode;
  config: RecordComposerConfig;
  students: Student[];
  selectedStudentId: string;
  selectedStudent?: Student;
  grade: (typeof gradeOptions)[number];
  department: Department;
  className: string;
  subjectName: string;
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
  isLoading: boolean;
  savedMessage: string;
  activeMemo: string;
  memoLength: number;
  canGenerate: boolean;
  handleStudentChange: (studentId: string) => void;
  setGrade: (grade: (typeof gradeOptions)[number]) => void;
  setDepartment: (department: Department) => void;
  setClassName: (className: string) => void;
  setSubjectName: (subjectName: string) => void;
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
  generateDraft: () => Promise<void>;
  copyDraft: () => Promise<void>;
  saveDraft: () => Promise<void>;
  resetInputs: () => void;
};

function modeConfig(mode: CommentMode): RecordComposerConfig {
  if (mode === "subject") {
    return {
      title: "세특 작성",
      description: "업로드된 교과/교육과정/NCS/루브릭 문서를 검색하고, 실제 관찰 내용을 바탕으로 세부능력 및 특기사항 초안을 생성합니다.",
      buttonLabel: "세특 생성",
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
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

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

    loadStudents();
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
      studentName: selectedStudent?.name,
      grade,
      department,
      subjectName,
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
    setSavedMessage("");
  }

  async function generateDraft() {
    setIsLoading(true);
    setSavedMessage("");
    setResult(null);

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildPayload())
      });

      const data = (await response.json()) as GenerateResponse;
      setResult(data);
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

  async function copyDraft() {
    if (!result?.draft) return;
    await navigator.clipboard.writeText(result.draft);
    setSavedMessage("초안을 클립보드에 복사했습니다.");
  }

  async function saveDraft() {
    if (!result?.draft) return;
    const saveResult = await saveRecordDraft({
      mode,
      studentId: selectedStudent?.id,
      payload: buildPayload(),
      result
    });

    setSavedMessage(saveResult.error ? `저장 실패: ${saveResult.error}` : "작성 기록을 Supabase에 저장했습니다.");
  }

  const activeMemo = mode === "subject" ? observationMemo : homeroomMemo;
  const memoLength = activeMemo.trim().length;
  const canGenerate =
    mode === "subject"
      ? memoLength >= 10 && subjectName.trim().length > 0 && activityTypes.length > 0
      : memoLength >= 10 && className.trim().length > 0 && schoolLifeAreas.length > 0 && industrialAttitudes.length > 0;

  const viewProps: RecordComposerViewProps = {
    mode,
    config,
    students,
    selectedStudentId,
    selectedStudent,
    grade,
    department,
    className,
    subjectName,
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
    isLoading,
    savedMessage,
    activeMemo,
    memoLength,
    canGenerate,
    handleStudentChange,
    setGrade,
    setDepartment,
    setClassName,
    setSubjectName,
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
    generateDraft,
    copyDraft,
    saveDraft,
    resetInputs
  };

  return (
    <>
      <MobileRecordStepper {...viewProps} />
      <DesktopRecordComposer {...viewProps} />
    </>
  );
}
