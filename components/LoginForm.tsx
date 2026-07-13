"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, LogIn, UserPlus } from "lucide-react";
import { DEFAULT_SCHOOL_CODE, getActiveSchoolOptions } from "@/lib/schools";
import { createSupabaseBrowserClient, hasSupabaseBrowserEnv } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [schoolCode, setSchoolCode] = useState(DEFAULT_SCHOOL_CODE);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const hasEnv = hasSupabaseBrowserEnv();
  const activeSchoolOptions = getActiveSchoolOptions();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  async function submit() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase 환경변수가 설정되지 않았습니다.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    if (isSignup) {
      const selectedSchool = activeSchoolOptions.find((school) => school.code === schoolCode);
      if (!selectedSchool) {
        setError("소속학교를 선택하세요.");
        setIsLoading(false);
        return;
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim() || email.split("@")[0],
            school_id: selectedSchool.code
          }
        }
      });

      setIsLoading(false);
      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setMessage("가입 요청이 완료되었습니다. Supabase Auth 이메일 확인 설정이 켜져 있다면 메일 인증 후 로그인하세요.");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setIsLoading(false);
    if (loginError) {
      setError(loginError.message);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-600 text-white">
          <BookOpenCheck size={23} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-950">실습기록 AI 학생부 도우미</h1>
          <p className="mt-1 text-sm text-slate-500">Supabase Auth로 로그인합니다.</p>
        </div>
      </div>

      <form
        className="mt-7 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {isSignup ? (
          <>
            <label className="block space-y-2">
              <span className="field-label">이름</span>
              <input className="input-base" value={name} onChange={(event) => setName(event.target.value)} placeholder="교사명" />
            </label>
            <label className="block space-y-2">
              <span className="field-label">소속학교</span>
              <select className="input-base" value={schoolCode} onChange={(event) => setSchoolCode(event.target.value)}>
                <option value="">학교를 선택하세요</option>
                {activeSchoolOptions.map((school) => (
                  <option key={school.code} value={school.code}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-700">
              현재 베타 테스트는 포항제철공업고등학교 소속 교사를 대상으로 운영됩니다.
            </p>
          </>
        ) : null}

        <label className="block space-y-2">
          <span className="field-label">이메일</span>
          <input className="input-base" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teacher@school.kr" />
        </label>
        <label className="block space-y-2">
          <span className="field-label">비밀번호</span>
          <input className="input-base" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호" />
        </label>

        <button className="primary-button w-full" type="submit" disabled={!hasEnv || !email.trim() || !password.trim() || (isSignup && !schoolCode) || isLoading}>
          {isSignup ? <UserPlus size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
          {isLoading ? "처리 중..." : isSignup ? "계정 만들기" : "로그인"}
        </button>
      </form>

      <button
        type="button"
        className="mt-4 w-full text-center text-sm font-semibold text-blue-700 hover:text-blue-800"
        onClick={() => {
          setIsSignup((current) => !current);
          setError("");
          setMessage("");
        }}
      >
        {isSignup ? "이미 계정이 있으면 로그인" : "베타 테스트 대상 교사라면 계정 만들기"}
      </button>

      {!hasEnv ? (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          Vercel 또는 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 설정해야 로그인할 수 있습니다.
        </p>
      ) : null}
      {message ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-xs leading-5 text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p> : null}
    </section>
  );
}
