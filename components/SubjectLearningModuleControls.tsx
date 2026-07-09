"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { curriculumSubjectTypeLabels, type CurriculumStandard, type CurriculumSubjectType } from "@/lib/curriculum";

type SubjectLearningModuleControlsProps = {
  subjectType: CurriculumSubjectType;
  learningModule: string;
  learningModuleOptions: string[];
  units: string[];
  unitOptions: string[];
  previewStandards: CurriculumStandard[];
  isLoading: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  onLearningModuleChange: (value: string) => void;
  onUnitsChange: (values: string[]) => void;
};

function learningModuleHelpText(subjectType: CurriculumSubjectType, isLoading: boolean, optionCount: number) {
  if (subjectType === "general") return "일반교과는 학습모듈을 사용하지 않습니다.";
  if (isLoading) return "학습모듈 목록을 불러오는 중입니다.";
  if (optionCount === 0) return "등록된 학습모듈이 없습니다.";
  return "학습모듈을 선택하면 해당 성취기준을 우선 반영합니다.";
}

export function SubjectLearningModuleControls({
  subjectType,
  learningModule,
  learningModuleOptions,
  units,
  unitOptions,
  previewStandards,
  isLoading,
  error,
  disabled = false,
  className = "",
  onLearningModuleChange,
  onUnitsChange
}: SubjectLearningModuleControlsProps) {
  const [customUnit, setCustomUnit] = useState("");
  const isNcsSubject = subjectType === "ncs";
  const moduleDisabled = disabled || !isNcsSubject || isLoading;
  const selectedUnits = useMemo(() => {
    const seen = new Set<string>();
    const next: string[] = [];

    units.forEach((unit) => {
      const normalized = unit.trim().replace(/\s+/g, " ");
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      next.push(normalized);
    });

    return next;
  }, [units]);
  const selectedUnitSet = useMemo(() => new Set(selectedUnits), [selectedUnits]);
  const selectableUnitOptions = useMemo(() => unitOptions.filter((option) => !selectedUnitSet.has(option)), [selectedUnitSet, unitOptions]);
  const unitSelectDisabled = disabled || !learningModule || unitOptions.length === 0;

  function addUnit(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized || selectedUnitSet.has(normalized)) return;
    onUnitsChange([...selectedUnits, normalized]);
  }

  function removeUnit(value: string) {
    onUnitsChange(selectedUnits.filter((unit) => unit !== value));
  }

  function addCustomUnit() {
    addUnit(customUnit);
    setCustomUnit("");
  }

  return (
    <div className={`min-w-0 space-y-3 ${className}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="field-label">학습모듈</span>
          <select
            className="input-base"
            value={learningModule}
            onChange={(event) => onLearningModuleChange(event.target.value)}
            disabled={moduleDisabled}
          >
            <option value="">선택 안 함</option>
            {learningModuleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className={`field-help ${isNcsSubject ? "text-slate-500" : "text-amber-700"}`}>
            {isLoading ? <Loader2 className="mr-1 inline animate-spin" size={13} aria-hidden="true" /> : null}
            {learningModuleHelpText(subjectType, isLoading, learningModuleOptions.length)}
          </span>
          {error ? <span className="block text-xs font-semibold text-rose-700">{error}</span> : null}
        </label>

        <div className="space-y-2">
          <span className="field-label">단원</span>
          <select
            className="input-base"
            value=""
            onChange={(event) => addUnit(event.target.value)}
            disabled={unitSelectDisabled || selectableUnitOptions.length === 0}
          >
            <option value="">
              {!learningModule ? "학습모듈 선택 후 단원 선택" : selectableUnitOptions.length === 0 ? "선택 가능한 단원이 없습니다" : "단원 선택"}
            </option>
            {selectableUnitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              className="input-base min-w-0"
              placeholder="직접 입력 단원 추가"
              value={customUnit}
              onChange={(event) => setCustomUnit(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomUnit();
                }
              }}
              disabled={disabled}
            />
            <button
              className="secondary-button shrink-0"
              type="button"
              onClick={addCustomUnit}
              disabled={disabled || customUnit.trim().length === 0}
            >
              <Plus size={16} aria-hidden="true" />
              추가
            </button>
          </div>

          {selectedUnits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedUnits.map((selectedUnit) => (
                <span key={selectedUnit} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">
                  {selectedUnit}
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-blue-700 hover:bg-blue-100 disabled:text-blue-300"
                    onClick={() => removeUnit(selectedUnit)}
                    disabled={disabled}
                    aria-label={`${selectedUnit} 단원 선택 해제`}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <span className="field-help">단원은 선택하지 않아도 되며, 여러 개를 선택하거나 직접 추가할 수 있습니다.</span>
        </div>
      </div>

      {learningModule ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-700">참고 성취기준 미리보기</p>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">
              {curriculumSubjectTypeLabels[subjectType]} · {selectedUnits.length > 0 ? `선택 단원 ${selectedUnits.length}개` : "단원 전체"} · 최대 5개
            </span>
          </div>
          {previewStandards.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {previewStandards.map((standard) => (
                <div key={standard.id} className="rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700">
                  <p className="font-bold text-slate-900">학습모듈: {standard.learningModule || learningModule}</p>
                  <p className="mt-1">
                    <span className="font-semibold text-slate-600">단원명:</span> {standard.unitName || "-"}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-slate-600">성취기준:</span> {standard.achievementStandard}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-slate-600">핵심키워드:</span> {standard.keywords || "-"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              {selectedUnits.length > 0 ? "선택한 단원에 해당하는 성취기준이 없습니다." : "선택한 학습모듈의 성취기준이 없습니다."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
