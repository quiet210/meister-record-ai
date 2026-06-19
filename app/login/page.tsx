import Link from "next/link";
import { BookOpenCheck, LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-600 text-white">
            <BookOpenCheck size={23} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-950">실습기록 AI 학생부 도우미</h1>
            <p className="mt-1 text-sm text-slate-500">공업계 고등학교 교사용 MVP</p>
          </div>
        </div>

        <form className="mt-7 space-y-4">
          <label className="block space-y-2">
            <span className="field-label">이메일</span>
            <input className="input-base" type="email" placeholder="teacher@school.kr" />
          </label>
          <label className="block space-y-2">
            <span className="field-label">비밀번호</span>
            <input className="input-base" type="password" placeholder="비밀번호" />
          </label>
          <Link href="/dashboard" className="primary-button w-full">
            <LogIn size={18} aria-hidden="true" />
            로그인
          </Link>
        </form>

        <p className="mt-4 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          MVP에서는 인증 화면만 제공하며, 실제 인증은 Supabase Auth 연결 시 활성화합니다.
        </p>
      </section>
    </main>
  );
}
