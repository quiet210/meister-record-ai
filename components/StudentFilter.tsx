"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

type DepartmentOption = {
  value: string;
  label: string;
};

type StudentFilterProps = {
  grade: string;
  department: string;
  selectedClasses: string[];
  gradeOptions: readonly string[];
  departmentOptions: readonly DepartmentOption[];
  classOptions: readonly string[];
  onGradeChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onSelectedClassesChange: (values: string[]) => void;
  onFilterChange?: () => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  className?: string;
};

export function StudentFilter({
  grade,
  department,
  selectedClasses,
  gradeOptions,
  departmentOptions,
  classOptions,
  onGradeChange,
  onDepartmentChange,
  onSelectedClassesChange,
  onFilterChange,
  disabled = false,
  title = "학생 필터",
  description = "학과, 학년, 반 순서로 조회 조건을 선택합니다.",
  className = ""
}: StudentFilterProps) {
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const classDropdownId = useId();
  const selectedClassSet = useMemo(() => new Set(selectedClasses), [selectedClasses]);
  const selectedDepartmentLabel = useMemo(
    () => departmentOptions.find((option) => option.value === department)?.label || department,
    [department, departmentOptions]
  );
  const isGradeDisabled = disabled || !department;
  const isClassDisabled = disabled || !department || !grade;
  const allClassesSelected = classOptions.length > 0 && classOptions.every((className) => selectedClassSet.has(className));
  const canReset = Boolean(grade || department || selectedClasses.length > 0);

  const criteriaLabel = useMemo(() => {
    if (!department) return "학과를 선택하세요.";
    if (!grade) return `${selectedDepartmentLabel} / 학년을 선택하세요.`;
    if (selectedClasses.length === 0) return `${selectedDepartmentLabel} / ${grade} / 반을 선택하세요.`;

    return `${selectedDepartmentLabel} / ${grade} / ${selectedClasses.join(", ")}`;
  }, [department, grade, selectedClasses, selectedDepartmentLabel]);

  useEffect(() => {
    if (isClassDisabled) setIsClassDropdownOpen(false);
  }, [isClassDisabled]);

  const handleDepartmentChange = useCallback(
    (value: string) => {
      onDepartmentChange(value);
      onGradeChange("");
      onSelectedClassesChange([]);
      onFilterChange?.();
    },
    [onDepartmentChange, onFilterChange, onGradeChange, onSelectedClassesChange]
  );

  const handleGradeChange = useCallback(
    (value: string) => {
      onGradeChange(value);
      onSelectedClassesChange([]);
      onFilterChange?.();
    },
    [onFilterChange, onGradeChange, onSelectedClassesChange]
  );

  const toggleClass = useCallback(
    (className: string) => {
      if (disabled) return;

      if (selectedClassSet.has(className)) {
        onSelectedClassesChange(selectedClasses.filter((value) => value !== className));
        onFilterChange?.();
        return;
      }

      onSelectedClassesChange([...selectedClasses, className]);
      onFilterChange?.();
    },
    [disabled, onFilterChange, onSelectedClassesChange, selectedClassSet, selectedClasses]
  );

  const selectAllClasses = useCallback(() => {
    onSelectedClassesChange([...classOptions]);
    onFilterChange?.();
  }, [classOptions, onFilterChange, onSelectedClassesChange]);

  const clearClasses = useCallback(() => {
    onSelectedClassesChange([]);
    onFilterChange?.();
  }, [onFilterChange, onSelectedClassesChange]);

  const resetFilters = useCallback(() => {
    onDepartmentChange("");
    onGradeChange("");
    onSelectedClassesChange([]);
    onFilterChange?.();
  }, [onDepartmentChange, onFilterChange, onGradeChange, onSelectedClassesChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <button className="secondary-button min-h-9 px-3 py-1.5 text-xs" type="button" onClick={resetFilters} disabled={disabled || !canReset}>
          선택 초기화
        </button>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <span className="font-bold text-slate-700">현재 조회 조건</span>
        <span className="ml-2 text-slate-600">{criteriaLabel}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="space-y-2">
          <span className="field-label">학과</span>
          <select className="input-base" value={department} onChange={(event) => handleDepartmentChange(event.target.value)} disabled={disabled}>
            <option value="">학과 선택</option>
            {departmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="field-label">학년</span>
          <select className="input-base" value={grade} onChange={(event) => handleGradeChange(event.target.value)} disabled={isGradeDisabled}>
            <option value="">{department ? "학년 선택" : "학과 먼저 선택"}</option>
            {gradeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <span className="field-label">반</span>
          <button
            className="input-base flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            aria-expanded={isClassDropdownOpen}
            aria-controls={classDropdownId}
            onClick={() => setIsClassDropdownOpen((current) => !current)}
            disabled={isClassDisabled}
          >
            <span className="truncate">
              {isClassDisabled ? "학과와 학년 선택 후 반 선택" : selectedClasses.length > 0 ? `${selectedClasses.length}개 반 선택` : "반 선택"}
            </span>
            <ChevronDown className={`shrink-0 transition ${isClassDropdownOpen ? "rotate-180" : ""}`} size={16} aria-hidden="true" />
          </button>

          {isClassDropdownOpen ? (
            <div id={classDropdownId} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <button className="secondary-button min-h-8 px-2.5 py-1 text-xs" type="button" onClick={selectAllClasses} disabled={allClassesSelected || classOptions.length === 0}>
                  전체 반 선택
                </button>
                <button className="secondary-button min-h-8 px-2.5 py-1 text-xs" type="button" onClick={clearClasses} disabled={selectedClasses.length === 0}>
                  반 선택 초기화
                </button>
              </div>

              {classOptions.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">선택 가능한 반이 없습니다.</div>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {classOptions.map((className) => {
                    const checked = selectedClassSet.has(className);
                    return (
                      <label key={className} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                        <input className="h-4 w-4" type="checkbox" checked={checked} onChange={() => toggleClass(className)} />
                        <span className="flex-1 font-semibold text-slate-700">{className}</span>
                        {checked ? <Check size={15} className="text-blue-700" aria-hidden="true" /> : null}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {selectedClasses.length > 0 ? (
        <div className="space-y-2">
          <p className="field-label">선택된 반</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedClasses.map((className) => (
              <span key={className} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                {className}
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-blue-700 hover:bg-blue-100"
                  onClick={() => toggleClass(className)}
                  aria-label={`${className} 제거`}
                  disabled={disabled}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
