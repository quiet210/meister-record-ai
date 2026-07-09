"use client";

import { Loader2, Sparkles } from "lucide-react";
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

export function DesktopRecordComposer(props: RecordComposerViewProps) {
  const { mode, config } = props;
  const { settingsOptions } = props;
  const selectedDepartmentLabel = props.selectedStudent
    ? props.studentDepartmentOptions.find((option) => option.value === props.selectedStudent?.department)?.label || props.selectedStudent.department
    : "";

  return (
    <div className="hidden min-w-0 space-y-6 lg:block">
      <section className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-blue-700">AI 학생부 작성</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-950">{config.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{config.description}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-xs font-semibold text-slate-500">작성 상태</p>
          <p className={`mt-1 text-sm font-bold ${props.canGenerate ? "text-emerald-700" : "text-amber-700"}`}>
            {props.canGenerate ? "생성 가능" : "입력 필요"}
          </p>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(320px,400px)] gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-5">
          <section className="panel p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">기본정보</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {mode === "subject" ? "과세특 생성에 필요한 교과 정보를 입력합니다." : "행특 생성에 필요한 학생과 학급 정보를 입력합니다."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <StudentFilter
                title="학생 조회"
                description="학과, 학년, 반을 순서대로 선택합니다. 반은 여러 개 선택할 수 있습니다."
                grade={props.gradeFilter}
                department={props.departmentFilter}
                selectedClasses={props.selectedClasses}
                gradeOptions={props.studentGradeOptions}
                departmentOptions={props.studentDepartmentOptions}
                classOptions={props.studentClassOptions}
                onGradeChange={props.setGradeFilter}
                onDepartmentChange={props.setDepartmentFilter}
                onSelectedClassesChange={props.setSelectedClasses}
                onFilterChange={props.clearSelectedStudent}
                disabled={props.isLoading}
              />

              {!props.hasStudentLookupCriteria ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  학과, 학년, 반을 선택하면 학생을 조회할 수 있습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <label className="space-y-2 xl:col-span-2">
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

                  {props.selectedStudent ? (
                    <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
                      <p className="text-xs font-bold text-blue-700">선택 학생</p>
                      <p className="mt-1 font-bold text-slate-900">
                        {props.selectedStudent.className} {props.selectedStudent.number}번 {props.selectedStudent.name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {props.selectedStudent.grade} · {selectedDepartmentLabel}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                      학생을 선택하면 기본정보가 채워집니다.
                    </div>
                  )}
                </div>
              )}

              {mode === "subject" ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <label className="space-y-2">
                    <span className="field-label">과목명</span>
                    <SubjectSelect value={props.subjectName} options={settingsOptions.subjectOptions} onChange={props.setSubjectName} />
                    <span className="field-help">교과유형: {props.subjectTypeLabel}</span>
                  </label>

                  <label className="space-y-2">
                    <span className="field-label">교과서</span>
                    <input
                      className="input-base"
                      placeholder="예: 자동화 설비 실습"
                      value={props.textbook}
                      onChange={(event) => props.setTextbook(event.target.value)}
                    />
                  </label>

                  <SubjectLearningModuleControls
                    className="xl:col-span-3"
                    subjectType={props.subjectType}
                    learningModule={props.learningModule}
                    learningModuleOptions={props.learningModuleOptions}
                    unit={props.unit}
                    unitOptions={props.learningModuleUnitOptions}
                    previewStandards={props.learningModulePreviewStandards}
                    isLoading={props.isLearningModuleLoading}
                    error={props.learningModuleError}
                    datalistId="unit-options-desktop"
                    onLearningModuleChange={props.setLearningModule}
                    onUnitChange={props.setUnit}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-lg font-bold text-slate-950">{mode === "subject" ? "활동 및 역량" : "생활 영역"}</h2>
            <div className="mt-5 space-y-6">
              {mode === "subject" ? (
                <>
                  {settingsOptions.subjectChecklistGroups.map((group) =>
                    group.key === "subject_activity_type" ? (
                      <SelectableChipGroup key={group.key} label={group.label} options={group.options} values={props.activityTypes} onChange={props.setActivityTypes} compact />
                    ) : (
                      <SelectableChipGroup key={group.key} label={group.label} options={group.options} values={props.competencies} onChange={props.setCompetencies} compact />
                    )
                  )}
                  <SelectableChipGroup label="보완점" options={improvementOptions} values={props.improvements} onChange={props.setImprovements} compact />
                </>
              ) : (
                <>
                  {settingsOptions.behaviorSchoolLifeChecklistGroups.map((group) => (
                    <SelectableChipGroup key={group.key} label={group.label} options={group.options} values={props.schoolLifeAreas} onChange={props.setSchoolLifeAreas} compact />
                  ))}
                  {settingsOptions.behaviorIndustrialChecklistGroups.map((group) => (
                    <SelectableChipGroup
                      key={group.key}
                      label={group.label}
                      options={group.options}
                      values={props.industrialAttitudes}
                      onChange={props.setIndustrialAttitudes}
                      compact
                    />
                  ))}
                  <SelectableChipGroup
                    label="보완할 점"
                    options={behaviorImprovementOptions}
                    values={props.behaviorImprovements}
                    onChange={props.setBehaviorImprovements}
                    compact
                  />
                  <fieldset className="space-y-3">
                    <legend className="field-label">분량 선택</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {commentLengthOptions.map((option) => {
                        const selected = props.lengthOption === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => props.setLengthOption(option.value as CommentLength)}
                            className={`min-h-16 rounded-md border px-3 py-2 text-left transition ${
                              selected ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                            }`}
                          >
                            <span className="block text-sm font-bold">{option.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">{option.help}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </>
              )}
            </div>
          </section>

          <section className="panel p-5">
            <label className="block space-y-2">
              <span className="field-label">{mode === "subject" ? "교사 관찰 메모" : "담임 관찰 메모"}</span>
              <textarea
                className="input-base min-h-44 resize-y leading-6"
                placeholder={
                  mode === "subject"
                    ? "실제 관찰한 행동을 입력하세요. 예: PLC 입력 주소를 잘못 지정해 센서가 동작하지 않자 배선 상태와 주소를 다시 확인하고 프로그램을 수정함."
                    : "학교생활 전반에서 실제 관찰한 행동을 입력하세요. 예: 학급 공용 물품 정리 담당을 맡아 등교 후 상태를 확인하고 친구들에게 사용 후 정리를 안내함."
                }
                value={props.activeMemo}
                onChange={(event) => {
                  if (mode === "subject") {
                    props.setObservationMemo(event.target.value);
                  } else {
                    props.setHomeroomMemo(event.target.value);
                  }
                }}
              />
              <span className="field-help">현재 {props.memoLength}자 · 메모 또는 선택 항목이 하나 이상 있으면 생성할 수 있습니다.</span>
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="primary-button" type="button" disabled={!props.canGenerate || props.isLoading} onClick={props.generateDraft}>
                {props.isLoading ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
                {config.buttonLabel}
              </button>
              <button className="secondary-button" type="button" onClick={props.resetInputs}>
                입력 초기화
              </button>
            </div>
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
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
          />
        </aside>
      </div>
    </div>
  );
}
