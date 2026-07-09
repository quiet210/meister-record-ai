"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, School, XCircle } from "lucide-react";
import { listAdminSchoolChangeRequests, reviewSchoolChangeRequest, type SchoolChangeRequest } from "@/lib/account";

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function AdminSchoolChangeRequests() {
  const [requests, setRequests] = useState<SchoolChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setIsLoading(true);
    setError("");

    const result = await listAdminSchoolChangeRequests();
    setRequests(result.requests);
    if (result.error) setError(result.error);
    setIsLoading(false);
  }

  async function review(id: string, action: "approve" | "reject") {
    setSavingId(id);
    setMessage("");
    setError("");

    const result = await reviewSchoolChangeRequest(id, action);
    if (result.error) {
      setError(result.error);
      setSavingId("");
      return;
    }

    await loadRequests();
    setMessage(action === "approve" ? "학교 변경 요청을 승인했습니다." : "학교 변경 요청을 반려했습니다.");
    setSavingId("");
  }

  return (
    <div className="space-y-5">
      <section className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Admin Settings</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">학교 변경 요청 관리</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              같은 학교 사용자로부터 접수된 대기 요청만 표시됩니다.
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <School size={25} aria-hidden="true" />
          </span>
        </div>
      </section>

      {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">대기 중 요청</h2>
            <p className="mt-1 text-xs text-slate-500">{requests.length}건</p>
          </div>
          <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={loadRequests} disabled={isLoading}>
            <RefreshCw size={16} aria-hidden="true" className={isLoading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        {isLoading ? (
          <div className="p-5 text-sm text-slate-500">요청 목록을 불러오는 중입니다.</div>
        ) : requests.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">대기 중인 학교 변경 요청이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((request) => {
              const canApprove = Boolean(request.requestedSchoolId.trim());
              return (
                <article key={request.id} className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">요청자</p>
                        <p className="mt-1 font-semibold text-slate-950">{request.requesterName || "-"}</p>
                        <p className="mt-1 break-all text-sm text-slate-500">{request.requesterEmail || request.userId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">현재 school_id</p>
                        <p className="mt-1 font-semibold text-slate-950">{request.currentSchoolId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">요청 학교</p>
                        <p className="mt-1 font-semibold text-slate-950">{request.requestedSchoolId || "-"}</p>
                        {request.requestedSchoolName ? <p className="mt-1 text-sm text-slate-500">{request.requestedSchoolName}</p> : null}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">요청일</p>
                        <p className="mt-1 font-semibold text-slate-950">{formatDateTime(request.createdAt)}</p>
                      </div>
                    </div>
                    <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{request.reason}</p>
                  </div>

                  <div className="flex flex-col gap-2 xl:w-32">
                    <button className="primary-button w-full" type="button" disabled={savingId === request.id || !canApprove} onClick={() => review(request.id, "approve")}>
                      <CheckCircle2 size={18} aria-hidden="true" />
                      승인
                    </button>
                    <button className="secondary-button w-full" type="button" disabled={savingId === request.id} onClick={() => review(request.id, "reject")}>
                      <XCircle size={18} aria-hidden="true" />
                      반려
                    </button>
                    {!canApprove ? <p className="text-xs leading-5 text-amber-700">학교 ID가 있어야 승인할 수 있습니다.</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
