"use client";

import { memo, type ReactNode } from "react";
import { Check, Clipboard, Eye, Loader2, Lock, RefreshCcw, Save, Unlock, X } from "lucide-react";
import { getEffectiveRecordContent, getRecordDraftLifecycleStatusMeta } from "@/lib/record-drafts";
import type { GenerateResponse, RecordDraftLifecycleStatus } from "@/lib/types";

type BulkDraftLifecycleEditorProps = {
  studentInfo: ReactNode;
  statusBadges: ReactNode;
  qualitySelector: ReactNode;
  aiContent: string;
  editedContent: string;
  finalContent: string;
  draftText?: string;
  lifecycleStatus: RecordDraftLifecycleStatus;
  error: string;
  warnings?: string[];
  savedMessage: string;
  pendingRegeneration: GenerateResponse | null;
  showCompare: boolean;
  isSaving: boolean;
  isRegenerating: boolean;
  canRegenerate: boolean;
  onEditedContentChange: (value: string) => void;
  onSave: () => void;
  onCopy: () => void;
  onToggleCompare: () => void;
  onRegenerate: () => void;
  onKeepCurrentDraft: () => void;
  onUseRegeneratedDraft: () => void;
  onFinalize: () => void;
  onUnfinalize: () => void;
};

function BulkDraftLifecycleEditorComponent({
  studentInfo,
  statusBadges,
  qualitySelector,
  aiContent,
  editedContent,
  finalContent,
  draftText,
  lifecycleStatus,
  error,
  warnings,
  savedMessage,
  pendingRegeneration,
  showCompare,
  isSaving,
  isRegenerating,
  canRegenerate,
  onEditedContentChange,
  onSave,
  onCopy,
  onToggleCompare,
  onRegenerate,
  onKeepCurrentDraft,
  onUseRegeneratedDraft,
  onFinalize,
  onUnfinalize
}: BulkDraftLifecycleEditorProps) {
  const lifecycleMeta = getRecordDraftLifecycleStatusMeta(lifecycleStatus);
  const effectiveContent = getEffectiveRecordContent({
    finalContent,
    editedContent,
    aiContent,
    draftText
  });
  const hasDraft = effectiveContent.length > 0;
  const isFinalized = lifecycleStatus === "finalized";

  return (
    <article className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[220px_minmax(0,1fr)_170px]">
      <div>
        {studentInfo}
        <div className="mt-3 grid gap-2">
          {statusBadges}
          <span className={`inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-bold ${lifecycleMeta.className}`}>
            <span className={`mr-1 h-2 w-2 rounded-full ${lifecycleMeta.dotClassName}`} aria-hidden="true" />
            {lifecycleMeta.label}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        {hasDraft ? (
          <label className="block space-y-2">
            <span className="field-label">교사 수정본</span>
            <textarea
              className="input-base min-h-36 resize-y bg-slate-50 leading-6"
              value={editedContent || effectiveContent}
              onChange={(event) => onEditedContentChange(event.target.value)}
              disabled={isFinalized}
            />
            <span className="field-help">
              {isFinalized ? "최종 확정 상태입니다. 수정하려면 최종 해제를 먼저 누르세요." : "수정 후 3초 동안 입력이 없으면 자동 저장됩니다."}
            </span>
          </label>
        ) : (
          <div className={`min-h-28 rounded-md border p-3 text-sm leading-6 ${error ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
            {error || "아직 생성 결과가 없습니다."}
          </div>
        )}

        {showCompare && hasDraft ? (
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold text-slate-500">AI 원본</p>
              <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {aiContent || draftText || "AI 원본이 없습니다."}
              </div>
            </div>
            <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3">
              <p className="text-xs font-bold text-blue-700">현재 수정본</p>
              <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-white p-3 text-sm leading-6 text-slate-800">
                {editedContent || effectiveContent || "현재 수정본이 없습니다."}
              </div>
            </div>
          </div>
        ) : null}

        {pendingRegeneration?.draft ? (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-bold text-blue-900">새 AI 결과</p>
            <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-white p-3 text-sm leading-6 text-slate-800">{pendingRegeneration.draft}</div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={onKeepCurrentDraft}>
                <X size={15} aria-hidden="true" />
                현재 유지
              </button>
              <button className="primary-button min-h-10 px-3 py-1.5" type="button" onClick={onUseRegeneratedDraft}>
                <Check size={15} aria-hidden="true" />
                새 결과 사용
              </button>
            </div>
          </div>
        ) : null}

        {warnings && warnings.length > 0 ? (
          <details className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            <summary className="cursor-pointer font-bold">확인 필요</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {savedMessage ? <p className="mt-2 text-xs font-semibold text-emerald-700">{savedMessage}</p> : null}
      </div>

      <div className="grid content-start gap-2">
        {qualitySelector}
        <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={onCopy} disabled={!hasDraft}>
          <Clipboard size={15} aria-hidden="true" />
          복사
        </button>
        <button className="primary-button min-h-10 px-3 py-1.5" type="button" onClick={onSave} disabled={!hasDraft || isSaving || isFinalized}>
          {isSaving ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
          저장
        </button>
        <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={onToggleCompare} disabled={!hasDraft}>
          <Eye size={15} aria-hidden="true" />
          AI 원본 보기
        </button>
        <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={onRegenerate} disabled={!canRegenerate || isRegenerating}>
          {isRegenerating ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <RefreshCcw size={15} aria-hidden="true" />}
          AI 다시 생성
        </button>
        {isFinalized ? (
          <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={onUnfinalize} disabled={!hasDraft || isSaving}>
            <Unlock size={15} aria-hidden="true" />
            최종 해제
          </button>
        ) : (
          <button className="primary-button min-h-10 px-3 py-1.5" type="button" onClick={onFinalize} disabled={!hasDraft || isSaving}>
            <Lock size={15} aria-hidden="true" />
            최종 확정
          </button>
        )}
      </div>
    </article>
  );
}

export const BulkDraftLifecycleEditor = memo(BulkDraftLifecycleEditorComponent);
