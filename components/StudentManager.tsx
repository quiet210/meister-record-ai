"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, UsersRound, X } from "lucide-react";
import { getFallbackSettingsOptions, loadSettingsOptions, type DepartmentOption } from "@/lib/admin-settings";
import { gradeOptions } from "@/lib/options";
import { createStudent, deleteStudent, listStudents, updateStudent, type StudentInput } from "@/lib/students";
import type { Department, Student } from "@/lib/types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

const fallbackSettings = getFallbackSettingsOptions();
const fallbackDepartment = fallbackSettings.departmentOptions[0]?.value || "materials";

function makeEmptyForm(department: Department = fallbackDepartment): StudentInput {
  return {
    name: "",
    grade: "1학년",
    department,
    className: "",
    number: ""
  };
}

export function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>(fallbackSettings.departmentOptions);
  const [form, setForm] = useState<StudentInput>(makeEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
          <button className="primary-button w-full sm:w-auto" type="button" onClick={submitStudent} disabled={!form.name.trim() || isSaving}>
            {editingId ? <Pencil size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
            {editingId ? "학생 수정" : "학생 추가"}
          </button>
          {editingId ? (
            <button className="secondary-button w-full sm:w-auto" type="button" onClick={resetForm} disabled={isSaving}>
              <X size={18} aria-hidden="true" />
              수정 취소
            </button>
          ) : null}
          <button className="secondary-button w-full sm:w-auto" type="button" onClick={loadStudents} disabled={isLoading || isSaving}>
            <RefreshCw size={18} aria-hidden="true" className={isLoading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}
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
                    disabled={isSaving}
                  >
                    <Pencil size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => removeStudent(student)}
                    aria-label={`${student.name} 삭제`}
                    disabled={isSaving}
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
