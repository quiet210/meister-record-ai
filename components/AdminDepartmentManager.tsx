"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import {
  createDepartment,
  deleteDepartment,
  listAdminDepartments,
  seedDefaultAdminSettings,
  updateDepartment,
  type DepartmentOption
} from "@/lib/admin-settings";

const emptyForm = {
  code: "",
  label: ""
};

export function AdminDepartmentManager() {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<DepartmentOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    setIsLoading(true);
    setError("");
    const result = await listAdminDepartments();
    setDepartments(result.departments);
    if (result.error) setError(result.error);
    setIsLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditing(null);
    setMessage("");
    setError("");
  }

  function startEdit(department: DepartmentOption) {
    setEditing(department);
    setForm({
      code: department.value,
      label: department.label
    });
    setMessage("");
    setError("");
  }

  async function saveDepartment() {
    setIsSaving(true);
    setMessage("");
    setError("");

    const result = editing?.id
      ? await updateDepartment(editing.id, { label: form.label })
      : await createDepartment({
          code: form.code,
          label: form.label
        });

    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    await loadDepartments();
    setMessage(editing ? "학과명을 수정했습니다." : "학과를 추가했습니다.");
    setForm(emptyForm);
    setEditing(null);
    setIsSaving(false);
  }

  async function removeDepartment(department: DepartmentOption) {
    if (!department.id) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    const result = await deleteDepartment(department.id);
    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    setDepartments((current) => current.filter((item) => item.id !== department.id));
    if (editing?.id === department.id) resetForm();
    setMessage(`${department.label} 학과를 삭제했습니다.`);
    setIsSaving(false);
  }

  async function fillDefaults() {
    setIsSaving(true);
    setMessage("");
    setError("");

    const result = await seedDefaultAdminSettings();
    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    await loadDepartments();
    setMessage("기본 설정값을 채웠습니다.");
    setIsSaving(false);
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm font-semibold text-blue-700">Admin Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">학과 관리</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          학과 코드는 학생 정보와 문서 태그에 저장되는 값입니다. 표시명은 언제든 수정할 수 있습니다.
        </p>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_1fr]">
          <label className="space-y-2">
            <span className="field-label">학과 코드</span>
            <input
              className="input-base"
              value={form.code}
              disabled={Boolean(editing)}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="예: materials"
            />
            <span className="field-help">영문, 숫자, 하이픈, 밑줄만 저장됩니다.</span>
          </label>
          <label className="space-y-2">
            <span className="field-label">학과명</span>
            <input
              className="input-base"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="예: 재료기술과"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className="primary-button w-full sm:w-auto" type="button" disabled={!form.label.trim() || (!editing && !form.code.trim()) || isSaving} onClick={saveDepartment}>
            {editing ? <Pencil size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
            {editing ? "학과 수정" : "학과 추가"}
          </button>
          {editing ? (
            <button className="secondary-button w-full sm:w-auto" type="button" disabled={isSaving} onClick={resetForm}>
              <X size={18} aria-hidden="true" />
              수정 취소
            </button>
          ) : null}
          <button className="secondary-button w-full sm:w-auto" type="button" disabled={isLoading || isSaving} onClick={loadDepartments}>
            <RefreshCw size={18} aria-hidden="true" className={isLoading ? "animate-spin" : ""} />
            새로고침
          </button>
          <button className="secondary-button w-full sm:w-auto" type="button" disabled={isSaving} onClick={fillDefaults}>
            <RotateCcw size={18} aria-hidden="true" />
            기본값 채우기
          </button>
        </div>

        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">등록된 학과</h2>
          <span className="text-xs font-semibold text-slate-500">{departments.length}개</span>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-slate-500">학과 목록을 불러오는 중입니다.</div>
        ) : departments.length === 0 ? (
          <div className="p-5 text-sm leading-6 text-slate-500">등록된 학과가 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {departments.map((department) => (
              <div key={department.id || department.value} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{department.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{department.value}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => startEdit(department)}
                    aria-label={`${department.label} 수정`}
                    disabled={isSaving}
                  >
                    <Pencil size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => removeDepartment(department)}
                    aria-label={`${department.label} 삭제`}
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
