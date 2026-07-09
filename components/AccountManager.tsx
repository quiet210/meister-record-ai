"use client";

import { useEffect, useState } from "react";
import { KeyRound, RefreshCw, School, Send, UserRound, X } from "lucide-react";
import {
  cancelSchoolChangeRequest,
  changePassword,
  createSchoolChangeRequest,
  getAccountProfile,
  listMySchoolChangeRequests,
  type AccountProfile,
  type SchoolChangeRequest,
  type SchoolChangeRequestStatus
} from "@/lib/account";

const statusLabels: Record<SchoolChangeRequestStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려"
};

const statusClassNames: Record<SchoolChangeRequestStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700"
};

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

const emptySchoolForm = {
  requestedSchoolId: "",
  requestedSchoolName: "",
  reason: ""
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function AccountManager() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [requests, setRequests] = useState<SchoolChangeRequest[]>([]);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [schoolForm, setSchoolForm] = useState(emptySchoolForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isRequestSaving, setIsRequestSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    setIsLoading(true);
    setError("");

    const [profileResult, requestResult] = await Promise.all([getAccountProfile(), listMySchoolChangeRequests()]);
    setProfile(profileResult.profile || null);
    setRequests(requestResult.requests);
    setError(profileResult.error || requestResult.error || "");
    setIsLoading(false);
  }

  async function submitPasswordChange() {
    setIsPasswordSaving(true);
    setMessage("");
    setError("");

    const result = await changePassword(passwordForm);
    if (result.error) {
      setError(result.error);
      setIsPasswordSaving(false);
      return;
    }

    setPasswordForm(emptyPasswordForm);
    setMessage(result.sessionPreserved ? "비밀번호를 변경했습니다. 현재 로그인 세션은 유지됩니다." : "비밀번호를 변경했습니다. 세션 상태를 다시 확인하세요.");
    setIsPasswordSaving(false);
  }

  async function submitSchoolChangeRequest() {
    setIsRequestSaving(true);
    setMessage("");
    setError("");

    const result = await createSchoolChangeRequest(schoolForm);
    if (result.error) {
      setError(result.error);
      setIsRequestSaving(false);
      return;
    }

    setSchoolForm(emptySchoolForm);
    await loadAccount();
    setMessage("소속학교 변경 요청을 등록했습니다.");
    setIsRequestSaving(false);
  }

  async function cancelRequest(id: string) {
    setIsRequestSaving(true);
    setMessage("");
    setError("");

    const result = await cancelSchoolChangeRequest(id);
    if (result.error) {
      setError(result.error);
      setIsRequestSaving(false);
      return;
    }

    setRequests((current) => current.filter((request) => request.id !== id));
    setMessage("소속학교 변경 요청을 취소했습니다.");
    setIsRequestSaving(false);
  }

  const hasPendingRequest = requests.some((request) => request.status === "pending");

  return (
    <div className="space-y-5">
      <section className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Account</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">회원정보</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              계정 정보와 소속학교는 학교별 데이터 접근 범위에 직접 연결됩니다.
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <UserRound size={24} aria-hidden="true" />
          </span>
        </div>
      </section>

      {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">기본 정보</h2>
          <button className="secondary-button min-h-10 px-3 py-1.5" type="button" onClick={loadAccount} disabled={isLoading}>
            <RefreshCw size={16} aria-hidden="true" className={isLoading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-slate-500">회원정보를 불러오는 중입니다.</div>
        ) : profile ? (
          <dl className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="space-y-1 p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">이름</dt>
              <dd className="font-semibold text-slate-950">{profile.name || "-"}</dd>
            </div>
            <div className="space-y-1 p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">이메일</dt>
              <dd className="break-all font-semibold text-slate-950">{profile.email || "-"}</dd>
            </div>
            <div className="space-y-1 p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">현재 소속학교 school_id</dt>
              <dd className="font-semibold text-slate-950">{profile.school_id}</dd>
            </div>
            <div className="space-y-1 p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">권한 role</dt>
              <dd className="font-semibold text-slate-950">{profile.role}</dd>
            </div>
            <div className="space-y-1 p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">가입일</dt>
              <dd className="font-semibold text-slate-950">{formatDateTime(profile.created_at)}</dd>
            </div>
            <div className="space-y-1 p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">최근 수정일</dt>
              <dd className="font-semibold text-slate-950">{formatDateTime(profile.updated_at)}</dd>
            </div>
          </dl>
        ) : (
          <div className="p-5 text-sm text-slate-500">회원정보를 찾지 못했습니다.</div>
        )}
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <h2 className="text-lg font-bold text-slate-950">비밀번호 변경</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="field-label">현재 비밀번호</span>
            <input
              className="input-base"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">새 비밀번호</span>
            <input
              className="input-base"
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">새 비밀번호 확인</span>
            <input
              className="input-base"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
          </label>
        </div>

        <button
          className="primary-button mt-4 w-full sm:w-auto"
          type="button"
          disabled={isPasswordSaving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
          onClick={submitPasswordChange}
        >
          <KeyRound size={18} aria-hidden="true" />
          {isPasswordSaving ? "변경 중..." : "비밀번호 변경"}
        </button>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
            <School size={20} aria-hidden="true" />
          </span>
          <h2 className="text-lg font-bold text-slate-950">소속학교 변경 요청</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="field-label">변경 희망 학교 ID</span>
            <input
              className="input-base"
              value={schoolForm.requestedSchoolId}
              onChange={(event) => setSchoolForm((current) => ({ ...current, requestedSchoolId: event.target.value }))}
              placeholder="예: meister-school"
              disabled={hasPendingRequest}
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">변경 희망 학교명</span>
            <input
              className="input-base"
              value={schoolForm.requestedSchoolName}
              onChange={(event) => setSchoolForm((current) => ({ ...current, requestedSchoolName: event.target.value }))}
              placeholder="예: 한국마이스터고"
              disabled={hasPendingRequest}
            />
          </label>
        </div>
        <label className="mt-4 block space-y-2">
          <span className="field-label">요청 사유</span>
          <textarea
            className="input-base min-h-28 resize-y"
            value={schoolForm.reason}
            onChange={(event) => setSchoolForm((current) => ({ ...current, reason: event.target.value }))}
            disabled={hasPendingRequest}
          />
        </label>

        <button
          className="primary-button mt-4 w-full sm:w-auto"
          type="button"
          disabled={isRequestSaving || hasPendingRequest || (!schoolForm.requestedSchoolId.trim() && !schoolForm.requestedSchoolName.trim()) || !schoolForm.reason.trim()}
          onClick={submitSchoolChangeRequest}
        >
          <Send size={18} aria-hidden="true" />
          요청 등록
        </button>

        <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200">
          {requests.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">등록된 학교 변경 요청이 없습니다.</div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClassNames[request.status]}`}>{statusLabels[request.status]}</span>
                    <span className="text-sm font-semibold text-slate-950">
                      {request.requestedSchoolId || request.requestedSchoolName || "-"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{request.reason}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    현재 {request.currentSchoolId} · 요청 {formatDateTime(request.createdAt)}
                    {request.reviewedAt ? ` · 처리 ${formatDateTime(request.reviewedAt)}` : ""}
                  </p>
                </div>
                {request.status === "pending" ? (
                  <button className="secondary-button w-full self-start sm:w-auto" type="button" disabled={isRequestSaving} onClick={() => cancelRequest(request.id)}>
                    <X size={18} aria-hidden="true" />
                    요청 취소
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
