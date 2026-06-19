"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, UsersRound } from "lucide-react";
import { departmentOptions, gradeOptions } from "@/lib/options";
import { readStoredStudents, writeStoredStudents } from "@/lib/students";
import type { Department, Student } from "@/lib/types";

function departmentLabel(value: Department) {
  return departmentOptions.find((option) => option.value === value)?.label || value;
}

export function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<Student["grade"]>("1학년");
  const [department, setDepartment] = useState<Department>("materials");
  const [className, setClassName] = useState("");
  const [number, setNumber] = useState("");

  useEffect(() => {
    setStudents(readStoredStudents());
  }, []);

  function persist(nextStudents: Student[]) {
    setStudents(nextStudents);
    writeStoredStudents(nextStudents);
  }

  function addStudent() {
    if (!name.trim()) return;
    const student: Student = {
      id: crypto.randomUUID(),
      name: name.trim(),
      grade,
      department,
      className: className.trim() || "-",
      number: number.trim() || "-"
    };

    persist([student, ...students]);
    setName("");
    setClassName("");
    setNumber("");
  }

  function removeStudent(id: string) {
    persist(students.filter((student) => student.id !== id));
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm font-semibold text-blue-700">학생 관리</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">작성 대상 학생</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          MVP에서는 학생 목록을 현재 브라우저에 저장합니다. Supabase 연결 후에는 학교별 학생 테이블로 교체할 수 있습니다.
        </p>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-2 lg:col-span-1">
            <span className="field-label">이름</span>
            <input className="input-base" value={name} onChange={(event) => setName(event.target.value)} placeholder="학생명" />
          </label>
          <label className="space-y-2">
            <span className="field-label">학년</span>
            <select className="input-base" value={grade} onChange={(event) => setGrade(event.target.value as Student["grade"])}>
              {gradeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="field-label">학과</span>
            <select className="input-base" value={department} onChange={(event) => setDepartment(event.target.value as Department)}>
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="field-label">반</span>
            <input className="input-base" value={className} onChange={(event) => setClassName(event.target.value)} placeholder="예: 2-1" />
          </label>
          <label className="space-y-2">
            <span className="field-label">번호</span>
            <input className="input-base" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="예: 07" />
          </label>
        </div>
        <button className="primary-button mt-4 w-full sm:w-auto" type="button" onClick={addStudent} disabled={!name.trim()}>
          <Plus size={18} aria-hidden="true" />
          학생 추가
        </button>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <UsersRound size={18} aria-hidden="true" className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">학생 목록</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">{students.length}명</span>
        </div>
        <div className="divide-y divide-slate-100">
          {students.map((student) => (
            <div key={student.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-950">{student.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {student.grade} · {departmentLabel(student.department)} · {student.className} · {student.number}번
                </p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => removeStudent(student.id)}
                aria-label={`${student.name} 삭제`}
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
