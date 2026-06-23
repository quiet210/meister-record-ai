"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { checkAdminAccess } from "@/lib/admin-settings";
import type { UserProfile } from "@/lib/students";

type AdminGuardProps = {
  children: ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAccess() {
      const result = await checkAdminAccess();
      if (!isMounted) return;

      if (result.context) {
        setProfile(result.context.profile);
        setError("");
      } else {
        setProfile(null);
        setError(result.error || "관리자 권한을 확인하지 못했습니다.");
      }

      setIsLoading(false);
    }

    loadAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="panel p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-950">관리자 권한 확인 중</h1>
            <p className="mt-1 text-sm text-slate-500">로그인한 계정의 role을 확인하고 있습니다.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!profile || error) {
    return (
      <section className="panel p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-700">Admin Settings</p>
            <h1 className="mt-1 text-xl font-bold text-slate-950">관리자만 접근할 수 있습니다.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
            <Link className="secondary-button mt-4" href="/dashboard">
              대시보드로 이동
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
