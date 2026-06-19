"use client";

import { Clipboard, RotateCcw, Save } from "lucide-react";
import type { CommentMode, GenerateResponse } from "@/lib/types";

type GeneratedResultCardProps = {
  mode: CommentMode;
  result: GenerateResponse | null;
  canGenerate: boolean;
  savedMessage: string;
  onCopy: () => void;
  onSave: () => void;
  onRewrite?: () => void;
  variant?: "desktop" | "mobile";
};

export function GeneratedResultCard({
  mode,
  result,
  canGenerate,
  savedMessage,
  onCopy,
  onSave,
  onRewrite,
  variant = "desktop"
}: GeneratedResultCardProps) {
  const isMobile = variant === "mobile";
  const description =
    mode === "subject" ? "검색 문서와 관찰 메모 안에서만 초안을 만듭니다." : "담임 관찰 메모와 선택한 생활 영역 안에서만 초안을 만듭니다.";

  return (
    <section className={`panel ${isMobile ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-blue-700">Preview</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">생성 결과</h2>
          {!isMobile ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${canGenerate ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {canGenerate ? "생성 가능" : "근거 부족"}
        </span>
      </div>

      <div className={`${isMobile ? "mt-4 min-h-56" : "mt-5 min-h-64"} rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800`}>
        {result?.draft ? result.draft : "생성 버튼을 누르면 학생부 초안이 여기에 표시됩니다."}
      </div>

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

      <div className={`mt-5 grid grid-cols-1 gap-2 ${isMobile ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-1"}`}>
        <button className="secondary-button" type="button" disabled={!result?.draft} onClick={onCopy}>
          <Clipboard size={17} aria-hidden="true" />
          복사
        </button>
        <button className="primary-button" type="button" disabled={!result?.draft} onClick={onSave}>
          <Save size={17} aria-hidden="true" />
          저장
        </button>
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
