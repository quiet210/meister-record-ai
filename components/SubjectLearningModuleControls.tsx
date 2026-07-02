"use client";

import { Loader2 } from "lucide-react";
import { curriculumSubjectTypeLabels, type CurriculumStandard, type CurriculumSubjectType } from "@/lib/curriculum";

type SubjectLearningModuleControlsProps = {
  subjectType: CurriculumSubjectType;
  learningModule: string;
  learningModuleOptions: string[];
  unit: string;
  unitOptions: string[];
  previewStandards: CurriculumStandard[];
  isLoading: boolean;
  error?: string;
  disabled?: boolean;
  datalistId: string;
  className?: string;
  onLearningModuleChange: (value: string) => void;
  onUnitChange: (value: string) => void;
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
  unit,
  unitOptions,
  previewStandards,
  isLoading,
  error,
  disabled = false,
  datalistId,
  className = "",
  onLearningModuleChange,
  onUnitChange
}: SubjectLearningModuleControlsProps) {
  const isNcsSubject = subjectType === "ncs";
  const moduleDisabled = disabled || !isNcsSubject || isLoading;
  const unitListId = unitOptions.length > 0 ? datalistId : undefined;

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

        <label className="space-y-2">
          <span className="field-label">단원</span>
          <input
            className="input-base"
            list={unitListId}
            placeholder="예: 센서 입력과 PLC 기본 명령어"
            value={unit}
            onChange={(event) => onUnitChange(event.target.value)}
            disabled={disabled}
          />
          {unitOptions.length > 0 ? (
            <datalist id={datalistId}>
              {unitOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          ) : null}
          <span className="field-help">단원명은 직접 입력할 수 있습니다.</span>
        </label>
      </div>

      {learningModule ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-700">참고 성취기준 미리보기</p>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">
              {curriculumSubjectTypeLabels[subjectType]} · 최대 5개
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
            <p className="mt-3 text-xs font-semibold text-slate-500">선택한 학습모듈의 성취기준이 없습니다.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
