"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Pencil, Plus, RefreshCw, Trash2, Upload, UsersRound, X } from "lucide-react";
import { getFallbackSettingsOptions, loadSettingsOptions, type DepartmentOption } from "@/lib/admin-settings";
import { gradeOptions } from "@/lib/options";
import { downloadStudentUploadTemplate } from "@/lib/student-template";
import { createStudent, createStudents, deleteStudent, listStudents, updateStudent, type StudentInput } from "@/lib/students";
import type { Department, Student } from "@/lib/types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

const fallbackSettings = getFallbackSettingsOptions();
const fallbackDepartment = fallbackSettings.departmentOptions[0]?.value || "materials";

const excelColumnAliases = {
  name: ["name", "studentname", "student", "이름", "학생명", "성명"],
  grade: ["grade", "학년"],
  department: ["department", "major", "학과", "전공", "계열"],
  className: ["classname", "class", "class_name", "반", "학급"],
  number: ["number", "no", "studentnumber", "student_number", "번호", "출석번호"]
};

function makeEmptyForm(department: Department = fallbackDepartment): StudentInput {
  return {
    name: "",
    grade: "1학년",
    department,
    className: "",
    number: ""
  };
}

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "").replace(/[_-]+/g, "").toLowerCase();
}

function cellToString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getRowValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const entry = Object.entries(row).find(([key]) => normalizedAliases.includes(normalizeHeader(key)));
  return entry ? cellToString(entry[1]) : "";
}

function normalizeGrade(value: string): Student["grade"] | null {
  const compact = value.replace(/\s+/g, "");
  if (["1", "1학년", "고1", "일학년"].includes(compact)) return "1학년";
  if (["2", "2학년", "고2", "이학년"].includes(compact)) return "2학년";
  if (["3", "3학년", "고3", "삼학년"].includes(compact)) return "3학년";
  return null;
}

function normalizeDepartment(value: string, departmentOptions: DepartmentOption[]): Department | null {
  const compact = normalizeHeader(value);
  const option = departmentOptions.find((item) => normalizeHeader(item.value) === compact || normalizeHeader(item.label) === compact);
  return option?.value || null;
}

async function parseStudentExcelFile(file: File, departmentOptions: DepartmentOption[]) {
  const { read, utils } = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      students: [],
      errors: ["엑셀 파일에서 시트를 찾을 수 없습니다."],
      warnings: []
    };
  }

  const rows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: "",
    raw: false
  });
  const students: StudentInput[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const name = getRowValue(row, excelColumnAliases.name);
    const rawGrade = getRowValue(row, excelColumnAliases.grade);
    const rawDepartment = getRowValue(row, excelColumnAliases.department);
    const className = getRowValue(row, excelColumnAliases.className);
    const number = getRowValue(row, excelColumnAliases.number);

    if (![name, rawGrade, rawDepartment, className, number].some(Boolean)) return;

    const grade = normalizeGrade(rawGrade);
    const department = normalizeDepartment(rawDepartment, departmentOptions);

    if (!name) errors.push(`${rowNumber}행: 이름이 없습니다.`);
    if (!grade) errors.push(`${rowNumber}행: 학년은 1학년, 2학년, 3학년 중 하나여야 합니다.`);
    if (!department) errors.push(`${rowNumber}행: 학과를 현재 학과 목록의 코드 또는 이름으로 입력하세요.`);

    if (!name || !grade || !department) return;

    students.push({
      name,
      grade,
      department,
      className,
      number
    });
  });

  if (rows.length === 0) {
    errors.push("엑셀 첫 번째 시트에 학생 데이터가 없습니다.");
  } else if (students.length === 0 && errors.length === 0) {
    errors.push("업로드할 학생 행을 찾지 못했습니다. 첫 행의 헤더를 확인하세요.");
  }

  const missingOptionalFields = students.filter((student) => !student.className.trim() || !student.number.trim()).length;
  if (missingOptionalFields > 0) {
    warnings.push(`반 또는 번호가 빈 ${missingOptionalFields}개 행은 '-'로 저장됩니다.`);
  }

  return {
    students,
    errors,
    warnings
  };
}

export function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>(fallbackSettings.departmentOptions);
  const [form, setForm] = useState<StudentInput>(makeEmptyForm());
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadSettings();
    loadStudents();
  }, []);

  async function loadSettings() {
    const settings = await loadSettingsOptions();
    setDepartmentOptions(settings.departmentOptions);
    setForm((current) => {
      if (settings.departmentOptions.some((option) => option.value === current.department)) return current;
      return {
        ...current,
        department: settings.departmentOptions[0]?.value || current.department
      };
    });
  }

  function departmentLabel(value: Department) {
    return departmentOptions.find((option) => option.value === value)?.label || value;
  }

  async function loadStudents() {
    setIsLoading(true);
    setError("");
    try {
      const result = await listStudents();
      setStudents(result.students);
      if (result.error) {
        console.error("[StudentManager] failed to fetch students", result.error);
        setError(result.error);
        return result.error;
      }
      return "";
    } catch (loadError) {
      const errorMessage = getErrorMessage(loadError);
      console.error("[StudentManager] failed to fetch students", loadError);
      setStudents([]);
      setError(errorMessage);
      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  }

  function updateForm<K extends keyof StudentInput>(key: K, value: StudentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(makeEmptyForm(departmentOptions[0]?.value));
    setEditingId(null);
    setMessage("");
    setError("");
  }

  function startEdit(student: Student) {
    setEditingId(student.id);
    setForm({
      name: student.name,
      grade: student.grade,
      department: student.department,
      className: student.className,
      number: student.number
    });
    setMessage("");
    setError("");
  }

  async function submitStudent() {
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const result = editingId ? await updateStudent(editingId, form) : await createStudent(form);
      if (result.error) {
        console.error("[StudentManager] failed to save student", result.error);
        setError(result.error);
        return;
      }

      const refreshError = await loadStudents();
      window.dispatchEvent(new Event("student-record-ai:students-changed"));
      setForm(makeEmptyForm(departmentOptions[0]?.value));
      setEditingId(null);
      if (refreshError) {
        setError(`학생 저장은 완료됐지만 목록을 다시 불러오지 못했습니다. ${refreshError}`);
        return;
      }
      setMessage(editingId ? "학생 정보를 수정했습니다." : "학생을 추가했습니다.");
    } catch (saveError) {
      const errorMessage = getErrorMessage(saveError);
      console.error("[StudentManager] failed to save student", saveError);
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadStudentsFromExcel() {
    if (!excelFile) return;

    setIsUploadingExcel(true);
    setMessage("");
    setError("");
    setUploadNotes([]);

    try {
      const parsed = await parseStudentExcelFile(excelFile, departmentOptions);
      if (parsed.errors.length > 0) {
        setError(`엑셀 업로드를 중단했습니다. ${parsed.errors.slice(0, 5).join(" ")}`);
        setUploadNotes(parsed.errors.slice(5));
        return;
      }

      const result = await createStudents(parsed.students);
      if (result.error) {
        console.error("[StudentManager] failed to upload students from excel", result.error);
        setError(result.error);
        return;
      }

      const refreshError = await loadStudents();
      window.dispatchEvent(new Event("student-record-ai:students-changed"));
      setExcelFile(null);
      setUploadNotes(parsed.warnings);
      if (excelInputRef.current) {
        excelInputRef.current.value = "";
      }

      if (refreshError) {
        setError(`학생 업로드는 완료됐지만 목록을 다시 불러오지 못했습니다. ${refreshError}`);
        return;
      }
      setMessage(`${result.students.length}명의 학생을 엑셀에서 업로드했습니다.`);
    } catch (uploadError) {
      const errorMessage = getErrorMessage(uploadError);
      console.error("[StudentManager] failed to upload students from excel", uploadError);
      setError(errorMessage);
    } finally {
      setIsUploadingExcel(false);
    }
  }

  async function removeStudent(student: Student) {
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const result = await deleteStudent(student.id);
      if (result.error) {
        console.error("[StudentManager] failed to delete student", result.error);
        setError(result.error);
        return;
      }

      setStudents((current) => current.filter((item) => item.id !== student.id));
      window.dispatchEvent(new Event("student-record-ai:students-changed"));
      if (editingId === student.id) {
        resetForm();
      }
      setMessage(`${student.name} 학생을 삭제했습니다.`);
    } catch (deleteError) {
      const errorMessage = getErrorMessage(deleteError);
      console.error("[StudentManager] failed to delete student", deleteError);
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm font-semibold text-blue-700">학생 관리</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">작성 대상 학생</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          학생 정보는 Supabase에 저장되며, 로그인한 교사의 학교 ID 기준으로 분리됩니다.
        </p>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-2 lg:col-span-1">
            <span className="field-label">이름</span>
            <input className="input-base" value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="학생명" />
          </label>
          <label className="space-y-2">
            <span className="field-label">학년</span>
            <select className="input-base" value={form.grade} onChange={(event) => updateForm("grade", event.target.value as Student["grade"])}>
              {gradeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="field-label">학과</span>
            <select className="input-base" value={form.department} onChange={(event) => updateForm("department", event.target.value as Department)}>
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="field-label">반</span>
            <input className="input-base" value={form.className} onChange={(event) => updateForm("className", event.target.value)} placeholder="예: 2-1" />
          </label>
          <label className="space-y-2">
            <span className="field-label">번호</span>
            <input className="input-base" value={form.number} onChange={(event) => updateForm("number", event.target.value)} placeholder="예: 07" />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className="primary-button w-full sm:w-auto" type="button" onClick={submitStudent} disabled={!form.name.trim() || isSaving || isUploadingExcel}>
            {editingId ? <Pencil size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
            {editingId ? "학생 수정" : "학생 추가"}
          </button>
          {editingId ? (
            <button className="secondary-button w-full sm:w-auto" type="button" onClick={resetForm} disabled={isSaving || isUploadingExcel}>
              <X size={18} aria-hidden="true" />
              수정 취소
            </button>
          ) : null}
          <button className="secondary-button w-full sm:w-auto" type="button" onClick={loadStudents} disabled={isLoading || isSaving || isUploadingExcel}>
            <RefreshCw size={18} aria-hidden="true" className={isLoading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}
        {uploadNotes.length > 0 ? (
          <ul className="mt-3 list-disc rounded-md bg-slate-50 p-3 pl-6 text-xs leading-5 text-slate-600">
            {uploadNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <FileSpreadsheet size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-950">학생 엑셀 업로드</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                첫 번째 시트의 헤더는 이름, 학년, 학과, 반, 번호를 사용합니다. 학년은 1학년, 2학년, 3학년 또는 고1, 고2, 고3으로 입력할 수 있습니다.
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                학과명은 관리자 설정에 등록된 학과명 또는 코드와 일치해야 합니다.
              </p>
            </div>
          </div>
          <button className="secondary-button w-full sm:w-auto" type="button" onClick={downloadStudentUploadTemplate}>
            <Download size={18} aria-hidden="true" />
            학생 엑셀 양식 다운로드
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="space-y-2">
            <span className="field-label">엑셀 파일</span>
            <input
              ref={excelInputRef}
              className="input-base"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(event) => {
                setExcelFile(event.target.files?.[0] || null);
                setUploadNotes([]);
                setMessage("");
                setError("");
              }}
              disabled={isSaving || isUploadingExcel}
            />
          </label>
          <button
            className="primary-button self-end"
            type="button"
            onClick={uploadStudentsFromExcel}
            disabled={!excelFile || isSaving || isUploadingExcel}
          >
            {isUploadingExcel ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
            엑셀 업로드
          </button>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <UsersRound size={18} aria-hidden="true" className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">학생 목록</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">{students.length}명</span>
        </div>

        {isLoading ? (
          <div className="p-5 text-sm text-slate-500">학생 목록을 불러오는 중입니다.</div>
        ) : students.length === 0 ? (
          <div className="p-5 text-sm leading-6 text-slate-500">등록된 학생이 없습니다. 로그인 상태와 Supabase 테이블/RLS 설정을 확인한 뒤 학생을 추가하세요.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((student) => (
              <div key={student.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{student.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {student.grade} · {departmentLabel(student.department)} · {student.className} · {student.number}번
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => startEdit(student)}
                    aria-label={`${student.name} 수정`}
                    disabled={isSaving || isUploadingExcel}
                  >
                    <Pencil size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => removeStudent(student)}
                    aria-label={`${student.name} 삭제`}
                    disabled={isSaving || isUploadingExcel}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
