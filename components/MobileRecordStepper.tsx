"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RotateCcw, Sparkles } from "lucide-react";
import {
  behaviorImprovementOptions,
  commentLengthOptions,
  improvementOptions
} from "@/lib/options";
import type { CommentLength } from "@/lib/types";
import type { RecordComposerViewProps } from "@/components/RecordComposer";
import { GeneratedResultCard } from "@/components/GeneratedResultCard";
import { SelectableChipGroup } from "@/components/SelectableChipGroup";
import { SubjectSelect } from "@/components/SubjectSelect";
import { SubjectLearningModuleControls } from "@/components/SubjectLearningModuleControls";
import { StudentFilter } from "@/components/StudentFilter";

const steps = ["기본정보", "활동/생활 영역 선택", "교사 메모", "결과"] as const;

export function MobileRecordStepper(props: RecordComposerViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { mode, config } = props;

  useEffect(() => {
    if (props.result) {
      setCurrentStep(3);
    }
  }, [props.result]);

  const canGoNext = useMemo(() => {
    if (currentStep === 0) {
      return Boolean(props.selectedStudent) && (mode === "subject" ? props.subjectName.trim().length > 0 : true);
    }

    if (currentStep === 1) {
      return true;
    }

    if (currentStep === 2) {
      return props.canGenerate;
    }

    return true;
  }, [currentStep, mode, props]);

  async function handleGenerate() {
    await props.generateDraft();
    setCurrentStep(3);
  }

  function rewrite() {
    setCurrentStep(0);
  }

  return (
    <div className="mx-auto max-w-2xl pb-36 lg:hidden">
      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold text-blue-700">AI 학생부 작성</p>
          <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">{config.title}</h1>
        </div>

        <div className="panel p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                {currentStep + 1} / {steps.length}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-950">{steps[currentStep]}</p>
            </div>
            <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${props.canGenerate ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {props.canGenerate ? "생성 가능" : "입력 중"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition ${index <= currentStep ? "bg-blue-600" : "bg-slate-200"}`}
                aria-label={step}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4">
        {currentStep === 0 ? <BasicInfoStep {...props} /> : null}
        {currentStep === 1 ? <SelectionStep {...props} /> : null}
        {currentStep === 2 ? <MemoStep {...props} /> : null}
        {currentStep === 3 ? (
          <GeneratedResultCard
            mode={mode}
            result={props.result}
            canGenerate={props.canGenerate}
            savedMessage={props.savedMessage}
            aiContent={props.aiContent}
            editedContent={props.editedContent}
            finalContent={props.finalContent}
            lifecycleStatus={props.lifecycleStatus}
            showCompare={props.showCompare}
            pendingRegeneration={props.pendingRegeneration}
            isSavingDraft={props.isSavingDraft}
            isRegenerating={props.isRegenerating}
            onEditedContentChange={props.setEditedContent}
            onCopy={props.copyDraft}
            onSave={props.saveDraft}
            onToggleCompare={props.toggleCompare}
            onRegenerate={props.regenerateDraft}
            onKeepCurrentDraft={props.keepCurrentDraft}
            onUseRegeneratedDraft={props.useRegeneratedDraft}
            onFinalize={props.finalizeDraft}
            onUnfinalize={props.unfinalizeDraft}
            onRewrite={rewrite}
            variant="mobile"
          />
        ) : null}
      </section>

      {currentStep < 3 ? (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-2xl grid-cols-[96px_1fr] gap-2">
            <button className="secondary-button" type="button" disabled={currentStep === 0} onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}>
              <ChevronLeft size={17} aria-hidden="true" />
              이전
            </button>
            {currentStep === 2 ? (
              <button className="primary-button" type="button" disabled={!props.canGenerate || props.isLoading} onClick={handleGenerate}>
                {props.isLoading ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
                생성하기
              </button>
            ) : (
              <button className="primary-button" type="button" disabled={!canGoNext} onClick={() => setCurrentStep((step) => Math.min(3, step + 1))}>
                다음
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2">
            <button className="secondary-button" type="button" onClick={() => setCurrentStep(2)}>
              <ChevronLeft size={17} aria-hidden="true" />
              메모 수정
            </button>
            <button className="primary-button" type="button" onClick={rewrite}>
              <RotateCcw size={17} aria-hidden="true" />
              다시 작성
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BasicInfoStep(props: RecordComposerViewProps) {
  const { mode } = props;
  const selectedDepartmentLabel = props.selectedStudent
    ? props.settingsOptions.departmentOptions.find((option) => option.value === props.selectedStudent?.department)?.label || props.selectedStudent.department
    : "";

  return (
    <section className="panel space-y-4 p-4">
      <StudentFilter
        title="학생 조회"
        description="학과, 학년, 반을 순서대로 선택합니다. 반은 여러 개 선택할 수 있습니다."
        grade={props.grade}
        department={props.department}
        selectedClasses={props.selectedClasses}
        gradeOptions={props.studentGradeOptions}
        departmentOptions={props.settingsOptions.departmentOptions}
        classOptions={props.studentClassOptions}
        onGradeChange={props.setGrade}
        onDepartmentChange={props.setDepartment}
        onSelectedClassesChange={props.setSelectedClasses}
        onFilterChange={props.clearSelectedStudent}
        disabled={props.isLoading}
      />

      {!props.hasStudentLookupCriteria ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
          학과, 학년, 반을 선택하면 학생을 조회할 수 있습니다.
        </div>
      ) : (
        <label className="space-y-2">
          <span className="field-label">학생</span>
          <select className="input-base" value={props.selectedStudentId} onChange={(event) => props.handleStudentChange(event.target.value)}>
            <option value="">{props.filteredStudents.length === 0 ? "조회된 학생이 없습니다" : "학생 선택"}</option>
            {props.filteredStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.className} {student.number}번 {student.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {props.hasStudentLookupCriteria && props.selectedStudent ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
          <p className="text-xs font-bold text-blue-700">선택 학생</p>
          <p className="mt-1 font-bold text-slate-900">
            {props.selectedStudent.className} {props.selectedStudent.number}번 {props.selectedStudent.name}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            {props.selectedStudent.grade} · {selectedDepartmentLabel}
          </p>
        </div>
      ) : props.hasStudentLookupCriteria ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          학생을 선택하면 기본정보가 채워집니다.
        </div>
      ) : null}

      {mode === "subject" ? (
        <>
          <label className="space-y-2">
            <span className="field-label">과목명</span>
            <SubjectSelect value={props.subjectName} options={props.settingsOptions.subjectOptions} onChange={props.setSubjectName} />
            <span className="field-help">교과유형: {props.subjectTypeLabel}</span>
          </label>
          <label className="space-y-2">
            <span className="field-label">교과서</span>
            <input className="input-base" placeholder="예: 자동화 설비 실습" value={props.textbook} onChange={(event) => props.setTextbook(event.target.value)} />
          </label>
          <SubjectLearningModuleControls
            subjectType={props.subjectType}
            learningModule={props.learningModule}
            learningModuleOptions={props.learningModuleOptions}
            unit={props.unit}
            unitOptions={props.learningModuleUnitOptions}
            previewStandards={props.learningModulePreviewStandards}
            isLoading={props.isLearningModuleLoading}
            error={props.learningModuleError}
            datalistId="unit-options-mobile"
            onLearningModuleChange={props.setLearningModule}
            onUnitChange={props.setUnit}
          />
        </>
      ) : null}
    </section>
  );
}

function SelectionStep(props: RecordComposerViewProps) {
  if (props.mode === "subject") {
    return (
      <section className="panel space-y-5 p-4">
        {props.settingsOptions.subjectChecklistGroups.map((group) =>
          group.key === "subject_activity_type" ? (
            <SelectableChipGroup key={group.key} label={group.label} options={group.options} values={props.activityTypes} onChange={props.setActivityTypes} compact />
          ) : (
            <SelectableChipGroup key={group.key} label={group.label} options={group.options} values={props.competencies} onChange={props.setCompetencies} compact />
          )
        )}
        <SelectableChipGroup label="보완점" options={improvementOptions} values={props.improvements} onChange={props.setImprovements} compact />
      </section>
    );
  }

  return (
    <section className="panel space-y-5 p-4">
      {props.settingsOptions.behaviorSchoolLifeChecklistGroups.map((group) => (
        <SelectableChipGroup key={group.key} label={group.label} options={group.options} values={props.schoolLifeAreas} onChange={props.setSchoolLifeAreas} compact />
      ))}
      {props.settingsOptions.behaviorIndustrialChecklistGroups.map((group) => (
        <SelectableChipGroup
          key={group.key}
          label={group.label}
          options={group.options}
          values={props.industrialAttitudes}
          onChange={props.setIndustrialAttitudes}
          compact
        />
      ))}
      <SelectableChipGroup label="보완할 점" options={behaviorImprovementOptions} values={props.behaviorImprovements} onChange={props.setBehaviorImprovements} compact />
      <fieldset className="space-y-3">
        <legend className="field-label">분량 선택</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {commentLengthOptions.map((option) => {
            const selected = props.lengthOption === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => props.setLengthOption(option.value as CommentLength)}
                className={`min-h-14 rounded-md border px-3 py-2 text-left transition ${
                  selected ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{option.help}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}

function MemoStep(props: RecordComposerViewProps) {
  return (
    <section className="panel p-4">
      <label className="block space-y-2">
        <span className="field-label">{props.mode === "subject" ? "교사 관찰 메모" : "담임 관찰 메모"}</span>
        <textarea
          className="input-base min-h-56 resize-y leading-6"
          placeholder={
            props.mode === "subject"
              ? "실제 관찰한 행동을 입력하세요."
              : "학교생활 전반에서 실제 관찰한 행동을 입력하세요."
          }
          value={props.activeMemo}
          onChange={(event) => {
            if (props.mode === "subject") {
              props.setObservationMemo(event.target.value);
            } else {
              props.setHomeroomMemo(event.target.value);
            }
          }}
        />
        <span className="field-help">현재 {props.memoLength}자 · 메모 또는 선택 항목이 하나 이상 있으면 생성할 수 있습니다.</span>
      </label>
    </section>
  );
}
