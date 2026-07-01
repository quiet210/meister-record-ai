"use client";

import { Check, Clipboard, Eye, Loader2, Lock, RefreshCcw, RotateCcw, Save, Unlock, X } from "lucide-react";
import { getEffectiveRecordContent, getRecordDraftLifecycleStatusMeta } from "@/lib/record-drafts";
import type { CommentMode, GenerateResponse, RecordDraftLifecycleStatus } from "@/lib/types";

type GeneratedResultCardProps = {
  mode: CommentMode;
  result: GenerateResponse | null;
  canGenerate: boolean;
  savedMessage: string;
  aiContent: string;
  editedContent: string;
  finalContent: string;
  lifecycleStatus: RecordDraftLifecycleStatus;
  showCompare: boolean;
  pendingRegeneration: GenerateResponse | null;
  isSavingDraft: boolean;
  isRegenerating: boolean;
  onEditedContentChange: (value: string) => void;
  onCopy: () => void;
  onSave: () => void;
  onToggleCompare: () => void;
  onRegenerate: () => void;
  onKeepCurrentDraft: () => void;
  onUseRegeneratedDraft: () => void;
  onFinalize: () => void;
  onUnfinalize: () => void;
  onRewrite?: () => void;
  variant?: "desktop" | "mobile";
};

export function GeneratedResultCard({
  mode,
  result,
  canGenerate,
  savedMessage,
  aiContent,
  editedContent,
  finalContent,
  lifecycleStatus,
  showCompare,
  pendingRegeneration,
  isSavingDraft,
  isRegenerating,
  onEditedContentChange,
  onCopy,
  onSave,
  onToggleCompare,
  onRegenerate,
  onKeepCurrentDraft,
  onUseRegeneratedDraft,
  onFinalize,
  onUnfinalize,
  onRewrite,
  variant = "desktop"
}: GeneratedResultCardProps) {
  const isMobile = variant === "mobile";
  const description =
    mode === "subject" ? "검색 문서와 관찰 메모 안에서만 초안을 만듭니다." : "담임 관찰 메모와 선택한 생활 영역 안에서만 초안을 만듭니다.";
  const statusMeta = getRecordDraftLifecycleStatusMeta(lifecycleStatus);
  const effectiveContent = getEffectiveRecordContent({
    finalContent,
    editedContent,
    aiContent,
    draftText: result?.draft
  });
  const hasDraft = effectiveContent.length > 0;
  const isFinalized = lifecycleStatus === "finalized";

  return (
    <section className={`panel ${isMobile ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-blue-700">Preview</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">생성 결과</h2>
          {!isMobile ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        <div className="grid shrink-0 gap-2">
          <span className={`rounded-md px-2.5 py-1 text-center text-xs font-bold ${canGenerate ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {canGenerate ? "생성 가능" : "근거 부족"}
          </span>
          {hasDraft ? (
            <span className={`inline-flex min-h-7 items-center justify-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold ${statusMeta.className}`}>
              <span className={`h-2 w-2 rounded-full ${statusMeta.dotClassName}`} aria-hidden="true" />
              {statusMeta.label}
            </span>
          ) : null}
        </div>
      </div>

      <label className={`block ${isMobile ? "mt-4" : "mt-5"} space-y-2`}>
        <span className="field-label">교사 수정본</span>
        <textarea
          className={`${isMobile ? "min-h-56" : "min-h-64"} input-base resize-y bg-slate-50 leading-7`}
          value={editedContent || effectiveContent}
          onChange={(event) => onEditedContentChange(event.target.value)}
          placeholder="생성 버튼을 누르면 학생부 초안이 여기에 표시됩니다."
          disabled={!hasDraft || isFinalized}
        />
        <span className="field-help">
          {isFinalized ? "최종 확정 상태입니다. 수정하려면 최종 해제를 먼저 누르세요." : "수정 후 3초 동안 입력이 없으면 자동 저장됩니다."}
        </span>
      </label>

      {showCompare && hasDraft ? (
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold text-slate-500">AI 원본</p>
            <div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {aiContent || result?.draft || "AI 원본이 없습니다."}
            </div>
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3">
            <p className="text-xs font-bold text-blue-700">현재 수정본</p>
            <div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md bg-white p-3 text-sm leading-6 text-slate-800">
              {editedContent || effectiveContent || "현재 수정본이 없습니다."}
            </div>
          </div>
        </div>
      ) : null}

      {pendingRegeneration?.draft ? (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
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

      {result?.warnings && result.warnings.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-bold text-amber-900">확인 필요</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result?.evidence && result.evidence.length > 0 ? (
        <details className="mt-4 rounded-md border border-slate-200 bg-white p-3" open={!isMobile}>
          <summary className="cursor-pointer text-sm font-bold text-slate-900">사용 근거</summary>
          <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
            {result.evidence.map((item) => (
              <li key={item} className="rounded-md bg-slate-50 px-2 py-1">
                {item}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {result?.sources && result.sources.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-900">검색된 문서</h3>
          <div className="mt-2 space-y-2">
            {result.sources.map((source, index) => (
              <details key={`${source.filename}-${index}`} className="rounded-md border border-slate-200 bg-white p-2">
                <summary className="cursor-pointer text-xs font-bold text-slate-700">
                  {source.filename}
                  {typeof source.score === "number" ? ` · ${source.score.toFixed(2)}` : ""}
                </summary>
                <p className="mt-2 line-clamp-6 text-xs leading-5 text-slate-600">{source.text}</p>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`mt-5 grid grid-cols-1 gap-2 ${isMobile ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-1"}`}>
        <button className="secondary-button" type="button" disabled={!hasDraft} onClick={onCopy}>
          <Clipboard size={17} aria-hidden="true" />
          복사
        </button>
        <button className="primary-button" type="button" disabled={!hasDraft || isSavingDraft || isFinalized} onClick={onSave}>
          {isSavingDraft ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
          저장
        </button>
        <button className="secondary-button" type="button" disabled={!hasDraft} onClick={onToggleCompare}>
          <Eye size={17} aria-hidden="true" />
          AI 원본 보기
        </button>
        <button className="secondary-button" type="button" disabled={!canGenerate || isRegenerating || isFinalized} onClick={onRegenerate}>
          {isRegenerating ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <RefreshCcw size={17} aria-hidden="true" />}
          AI 다시 생성
        </button>
        {isFinalized ? (
          <button className="secondary-button" type="button" disabled={!hasDraft || isSavingDraft} onClick={onUnfinalize}>
            <Unlock size={17} aria-hidden="true" />
            최종 해제
          </button>
        ) : (
          <button className="primary-button" type="button" disabled={!hasDraft || isSavingDraft} onClick={onFinalize}>
            <Lock size={17} aria-hidden="true" />
            최종 확정
          </button>
        )}
        {onRewrite ? (
          <button className="secondary-button" type="button" onClick={onRewrite}>
            <RotateCcw size={17} aria-hidden="true" />
            다시 작성
          </button>
        ) : null}
      </div>
      {savedMessage ? <p className="mt-3 text-sm font-semibold text-emerald-700">{savedMessage}</p> : null}
    </section>
  );
}
