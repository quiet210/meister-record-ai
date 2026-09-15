"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CalendarDays, RefreshCw } from "lucide-react";
import { getUsdKrwRate } from "@/lib/ai-pricing";
import { loadAdminAiUsageReport, type AdminAiUsageReport, type AiUsageDatePreset } from "@/lib/ai-usage";

type DateRange = {
  from: string;
  to: string;
};

const presetOptions: Array<{ value: AiUsageDatePreset; label: string }> = [
  { value: "today", label: "오늘" },
  { value: "last7days", label: "최근 7일" },
  { value: "month", label: "이번 달" },
  { value: "custom", label: "직접 선택" }
];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function getDateRange(preset: AiUsageDatePreset, customStart: string, customEnd: string): DateRange {
  const today = startOfDay(new Date());

  if (preset === "today") {
    return {
      from: today.toISOString(),
      to: addDays(today, 1).toISOString()
    };
  }

  if (preset === "last7days") {
    return {
      from: addDays(today, -6).toISOString(),
      to: addDays(today, 1).toISOString()
    };
  }

  if (preset === "custom") {
    const fromDate = parseDateInput(customStart, today);
    const toDate = addDays(parseDateInput(customEnd || customStart, today), 1);
    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString()
    };
  }

  return {
    from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
    to: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString()
  };
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  }).format(value);
}

function formatKrw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function modeLabel(mode: string) {
  return mode === "subject" ? "과세특" : "행동특성";
}

function SummaryCard({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-normal text-slate-950">{value}</p>
      {help ? <p className="mt-1 text-xs leading-5 text-slate-500">{help}</p> : null}
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return <div className="p-5 text-sm text-slate-500">{children}</div>;
}

export function AdminAiUsageDashboard() {
  const todayValue = toDateInputValue(new Date());
  const [preset, setPreset] = useState<AiUsageDatePreset>("month");
  const [customStart, setCustomStart] = useState(todayValue);
  const [customEnd, setCustomEnd] = useState(todayValue);
  const [report, setReport] = useState<AdminAiUsageReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const dateRange = useMemo(() => getDateRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const usdKrwRate = getUsdKrwRate();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError("");

      const result = await loadAdminAiUsageReport(dateRange);
      if (!isMounted) return;

      setReport(result.report || null);
      if (result.error) setError(result.error);
      setIsLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [dateRange]);

  async function refresh() {
    setIsLoading(true);
    setError("");

    const result = await loadAdminAiUsageReport(dateRange);
    setReport(result.report || null);
    if (result.error) setError(result.error);
    setIsLoading(false);
  }

  const totals = report?.totals;

  return (
    <div className="space-y-5">
      <section className="panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Admin Usage</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">AI 사용량</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Gemini API 응답의 토큰 사용량을 기준으로 학교별 생성 요청과 예상 비용을 집계합니다.
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <BarChart3 size={25} aria-hidden="true" />
          </span>
        </div>
      </section>

      <section className="panel p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="field-label flex items-center gap-2">
              <CalendarDays size={17} aria-hidden="true" />
              기간 필터
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {presetOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition ${
                    preset === option.value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                  }`}
                  onClick={() => setPreset(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_160px_auto]">
            <label className="space-y-2">
              <span className="field-label">시작일</span>
              <input className="input-base" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} disabled={preset !== "custom"} />
            </label>
            <label className="space-y-2">
              <span className="field-label">종료일</span>
              <input className="input-base" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} disabled={preset !== "custom"} />
            </label>
            <button className="secondary-button self-end" type="button" onClick={refresh} disabled={isLoading}>
              <RefreshCw size={17} aria-hidden="true" className={isLoading ? "animate-spin" : ""} />
              새로고침
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <p>
            표시된 비용은 Gemini API 응답의 토큰 사용량과 등록된 모델 단가를 기준으로 계산한 예상 비용입니다. 실제 Google 청구 금액과 차이가 있을 수
            있으며, 최종 청구 기준은 Google AI Studio와 Cloud Billing입니다. 원화 환산 기준은 1 USD = {formatKrw(usdKrwRate)}입니다.
          </p>
        </div>
      </section>

      {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      {isLoading ? (
        <section className="panel p-5 text-sm text-slate-500">AI 사용량을 불러오는 중입니다.</section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="이번 기간 총 요청 수" value={formatInteger(totals?.requestCount || 0)} />
            <SummaryCard label="성공 요청 수" value={formatInteger(totals?.successCount || 0)} />
            <SummaryCard label="실패 요청 수" value={formatInteger(totals?.failedCount || 0)} />
            <SummaryCard label="입력 토큰" value={formatInteger(totals?.promptTokens || 0)} />
            <SummaryCard label="출력 토큰" value={formatInteger(totals?.outputTokens || 0)} />
            <SummaryCard label="총 토큰" value={formatInteger(totals?.totalTokens || 0)} />
            <SummaryCard label="예상 비용 USD" value={formatUsd(totals?.estimatedCostUsd || 0)} help="세금과 할인은 포함하지 않습니다." />
            <SummaryCard label="예상 비용 KRW" value={formatKrw(totals?.estimatedCostKrw || 0)} help="환산 기준으로만 표시합니다." />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="panel overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">구분별 집계</h2>
              </div>
              {report && report.byMode.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="px-4 py-3">구분</th>
                        <th className="px-4 py-3 text-right">생성 건수</th>
                        <th className="px-4 py-3 text-right">총 토큰</th>
                        <th className="px-4 py-3 text-right">예상 비용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.byMode.map((item) => (
                        <tr key={item.mode}>
                          <td className="px-4 py-3 font-semibold text-slate-900">{modeLabel(item.mode)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatInteger(item.requestCount)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatInteger(item.totalTokens)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatUsd(item.estimatedCostUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>선택한 기간의 사용량이 없습니다.</EmptyState>
              )}
            </div>

            <div className="panel overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">모델별 집계</h2>
              </div>
              {report && report.byModel.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="px-4 py-3">모델</th>
                        <th className="px-4 py-3 text-right">요청 수</th>
                        <th className="px-4 py-3 text-right">토큰</th>
                        <th className="px-4 py-3 text-right">예상 비용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.byModel.map((item) => (
                        <tr key={item.model}>
                          <td className="px-4 py-3 font-semibold text-slate-900">{item.model}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatInteger(item.requestCount)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatInteger(item.totalTokens)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatUsd(item.estimatedCostUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>선택한 기간의 모델별 사용량이 없습니다.</EmptyState>
              )}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">교사별 집계</h2>
            </div>
            {report && report.byTeacher.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">교사</th>
                      <th className="px-4 py-3 text-right">요청 수</th>
                      <th className="px-4 py-3 text-right">과세특</th>
                      <th className="px-4 py-3 text-right">행동특성</th>
                      <th className="px-4 py-3 text-right">총 토큰</th>
                      <th className="px-4 py-3 text-right">예상 비용</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.byTeacher.map((item) => (
                      <tr key={item.userId}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="mt-1 break-all text-xs text-slate-500">{item.email}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatInteger(item.requestCount)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatInteger(item.subjectCount)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatInteger(item.behaviorCount)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatInteger(item.totalTokens)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatUsd(item.estimatedCostUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>선택한 기간의 교사별 사용량이 없습니다.</EmptyState>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="panel overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">최근 오류 요약</h2>
              </div>
              {report && report.errorSummary.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {report.errorSummary.map((item) => (
                    <div key={item.errorCode} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-900">{item.errorCode}</span>
                      <span className="text-slate-600">{formatInteger(item.count)}건</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>선택한 기간의 실패 요청이 없습니다.</EmptyState>
              )}
            </div>

            <div className="panel overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">최근 실패 요청</h2>
              </div>
              {report && report.recentFailures.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="px-4 py-3">시간</th>
                        <th className="px-4 py-3">구분</th>
                        <th className="px-4 py-3">사용자</th>
                        <th className="px-4 py-3">모델</th>
                        <th className="px-4 py-3">오류</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.recentFailures.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-slate-700">{formatDateTime(item.createdAt)}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{modeLabel(item.mode)}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{item.userName}</p>
                            <p className="mt-1 break-all text-xs text-slate-500">{item.userEmail}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{item.model}</td>
                          <td className="px-4 py-3 font-semibold text-rose-700">{item.errorCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>선택한 기간의 실패 요청이 없습니다.</EmptyState>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
