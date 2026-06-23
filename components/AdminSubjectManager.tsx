"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { createSubject, deleteSubject, listAdminSubjects, seedDefaultAdminSettings, updateSubject, type SubjectOption } from "@/lib/admin-settings";

export function AdminSubjectManager() {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<SubjectOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    setIsLoading(true);
    setError("");
    const result = await listAdminSubjects();
    setSubjects(result.subjects);
    if (result.error) setError(result.error);
    setIsLoading(false);
  }

  function resetForm() {
    setName("");
    setEditing(null);
    setMessage("");
    setError("");
  }

  function startEdit(subject: SubjectOption) {
    setEditing(subject);
    setName(subject.name);
    setMessage("");
    setError("");
  }

  async function saveSubject() {
    setIsSaving(true);
    setMessage("");
    setError("");

    const result = editing?.id ? await updateSubject(editing.id, { name }) : await createSubject({ name });
    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    await loadSubjects();
    setMessage(editing ? "과목명을 수정했습니다." : "과목을 추가했습니다.");
    setName("");
    setEditing(null);
    setIsSaving(false);
  }

  async function removeSubject(subject: SubjectOption) {
    if (!subject.id) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    const result = await deleteSubject(subject.id);
    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    setSubjects((current) => current.filter((item) => item.id !== subject.id));
    if (editing?.id === subject.id) resetForm();
    setMessage(`${subject.name} 과목을 삭제했습니다.`);
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

    await loadSubjects();
    setMessage("기본 설정값을 채웠습니다.");
    setIsSaving(false);
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm font-semibold text-blue-700">Admin Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">과목 관리</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          과목명은 세특 작성과 지식베이스 업로드 화면의 자동완성 목록에 사용됩니다.
        </p>
      </section>

      <section className="panel p-4 sm:p-5">
        <label className="block space-y-2">
          <span className="field-label">과목명</span>
          <input className="input-base" value={name} onChange={(event) => setName(event.target.value)} placeholder="예: PLC제어" />
        </label>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className="primary-button w-full sm:w-auto" type="button" disabled={!name.trim() || isSaving} onClick={saveSubject}>
            {editing ? <Pencil size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
            {editing ? "과목 수정" : "과목 추가"}
          </button>
          {editing ? (
            <button className="secondary-button w-full sm:w-auto" type="button" disabled={isSaving} onClick={resetForm}>
              <X size={18} aria-hidden="true" />
              수정 취소
            </button>
          ) : null}
          <button className="secondary-button w-full sm:w-auto" type="button" disabled={isLoading || isSaving} onClick={loadSubjects}>
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
          <h2 className="text-sm font-bold text-slate-900">등록된 과목</h2>
          <span className="text-xs font-semibold text-slate-500">{subjects.length}개</span>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-slate-500">과목 목록을 불러오는 중입니다.</div>
        ) : subjects.length === 0 ? (
          <div className="p-5 text-sm leading-6 text-slate-500">등록된 과목이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subjects.map((subject) => (
              <div key={subject.id || subject.name} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                <p className="min-w-0 font-semibold text-slate-950">{subject.name}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => startEdit(subject)}
                    aria-label={`${subject.name} 수정`}
                    disabled={isSaving}
                  >
                    <Pencil size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => removeSubject(subject)}
                    aria-label={`${subject.name} 삭제`}
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
