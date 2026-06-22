# Project Status

최종 업데이트: 2026-06-22

## 현재 상태 요약

마이스터고 학생부 작성 지원 앱은 Next.js App Router, TypeScript, TailwindCSS, Gemini API, Supabase 기반 구조로 전환 중이다. 학생 관리 화면은 localStorage fallback 없이 Supabase Auth + Supabase DB 기반 CRUD를 사용한다.

2026-06-22 추가 점검에서 학생 추가 실패 원인을 화면과 브라우저 console에서 확인할 수 있도록 보강했다. `createStudent()`는 `public.students`에 실제 insert를 수행하며, 실패 시 Supabase 오류의 `message`, `details`, `hint`, `code`와 RLS 의심 안내를 UI와 console에 남긴다. 학생 추가/수정 성공 후에는 Supabase에서 목록을 다시 fetch한다.

현재 빌드 상태:

- `npm run typecheck` 통과
- `npm run build` 통과
- 로컬 개발 서버는 최근 `http://localhost:3002` 기준으로 실행 확인됨

## Supabase Auth 연결 상태

구현 상태:

- Supabase 브라우저 클라이언트 생성 유틸이 있음: `lib/supabase.ts`
- 로그인/회원가입 UI 구현됨: `components/LoginForm.tsx`
- 로그아웃 버튼 구현됨: `components/LogoutButton.tsx`
- 로그인 페이지가 실제 Supabase Auth 폼을 사용함: `app/login/page.tsx`
- 회원가입 시 `user_metadata`에 `name`, `school_id`를 넣도록 구현됨
- 로그인 성공 시 `/dashboard`로 이동하도록 구현됨

주의할 점:

- 앱 라우트 보호 미들웨어는 아직 없다.
- `/dashboard`, `/students`, `/subject-comment`, `/behavior-comment`, `/knowledge`는 로그인하지 않아도 페이지 자체는 접근될 수 있다.
- 클라이언트 CRUD 함수에서 `supabase.auth.getUser()`로 로그인 여부를 확인하므로, 데이터 작업은 로그인 없이는 실패한다.

## Vercel 환경변수 설정 여부

코드와 예시는 준비되어 있으나, 실제 Vercel 프로젝트에 값이 등록되었는지는 이 로컬 작업 환경에서 확인하지 못했다.

필수 환경변수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_DEFAULT_SCHOOL_ID=demo-school
```

서버/관리 기능 및 기존 RAG 실험용:

```bash
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=knowledge-files
DEFAULT_SCHOOL_ID=demo-school
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_VECTOR_STORE_ID=
```

Gemini 생성용:

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

확인해야 할 것:

- Vercel Project Settings > Environment Variables에 위 값이 Production/Preview/Development 각각 필요한 범위로 등록되어 있는지 확인
- Supabase publishable key 또는 anon key가 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`에 들어갔는지 확인
- `.env.local`에는 값이 있을 수 있으나, 운영 배포에는 Vercel 환경변수가 별도로 필요함

## 생성된 테이블

마이그레이션 파일:

- `supabase/migrations/20260622_auth_students.sql`

생성 대상:

- `public.schools`
- `public.users`
- `public.students`
- `public.record_drafts`

주요 관계:

- `public.users.id` -> `auth.users.id`
- `public.users.school_id` -> `public.schools.id`
- `public.students.school_id` -> `public.schools.id`
- `public.students.created_by` -> `public.users.id`
- `public.record_drafts.school_id` -> `public.schools.id`
- `public.record_drafts.user_id` -> `public.users.id`
- `public.record_drafts.student_id` -> `public.students.id`

RLS:

- `public.users`: 자기 프로필 select/insert 허용
- `public.students`: 같은 `school_id` 사용자만 select/insert/update/delete 허용
- `public.record_drafts`: 같은 `school_id` 사용자만 select/insert 허용

트리거:

- `auth.users` insert 후 `public.handle_new_auth_user()` 실행
- 신규 Auth 사용자 생성 시 `public.users` 프로필 자동 생성 시도
- `users`, `students`의 `updated_at` 자동 갱신

## 현재 문제: students 테이블에 실제 insert가 안 됨

보고된 증상:

- 학생 관리 화면은 Supabase CRUD를 호출하도록 변경됨.
- 그러나 실제 Supabase 프로젝트에서 `students` insert가 되지 않는 문제가 보고됨.

이번 코드 점검 결과:

- `components/StudentManager.tsx`는 active `localStorage`를 사용하지 않음
- `lib/students.ts`의 `createStudent()`는 `.from("students").insert(...)`로 `public.students`에 insert함
- insert payload는 migration 컬럼과 일치함: `name`, `grade`, `department`, `class_name`, `number`, `school_id`, `created_by`
- `school_id`는 로그인 사용자 metadata의 `school_id`를 우선 사용하고, 없으면 `NEXT_PUBLIC_DEFAULT_SCHOOL_ID` 또는 `DEFAULT_SCHOOL_ID`, 마지막으로 `demo-school`을 사용함
- `public.students` RLS insert 정책은 `public.users.id = auth.uid()`이고 `public.users.school_id = students.school_id`일 때만 허용함
- 학생 추가/수정 후에는 `listStudents()`를 다시 호출해 Supabase 기준 목록으로 화면을 갱신함
- `schools` upsert, `users` profile 생성, `students` insert/select 실패가 더 이상 조용히 묻히지 않고 화면과 console에 표시됨

실제 Supabase 프로젝트에서 계속 insert가 안 되면 가능성이 높은 원인:

1. `public.users` 프로필이 생성되지 않았거나 현재 로그인한 `auth.uid()`와 매칭되지 않음
2. `public.users.school_id`와 insert하려는 `students.school_id`가 다름
3. RLS 정책에서 참조하는 `public.users` row가 없어 `with check`가 false가 됨
4. `supabase/migrations/20260622_auth_students.sql`이 실제 Supabase 프로젝트에 아직 적용되지 않았거나 일부만 적용됨
5. Auth 이메일 확인 설정 때문에 회원가입 직후 session이 없고, 로그인 상태 없이 CRUD를 시도함
6. `NEXT_PUBLIC_SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 잘못되어 다른 Supabase 프로젝트를 보고 있음

우선 확인 SQL:

```sql
select id, email, raw_user_meta_data
from auth.users
order by created_at desc;

select id, school_id, email, name, role
from public.users
order by created_at desc;

select id, school_id, name, grade, department, class_name, number, created_by
from public.students
order by created_at desc;
```

현재 로그인 사용자의 `auth.uid()`와 `public.users.id`가 일치해야 하며, `students.school_id`는 `public.users.school_id`와 같아야 한다.

임시 진단 방법:

- Supabase SQL Editor에서 위 3개 select 결과 확인
- 브라우저 개발자 콘솔 또는 학생 관리 화면의 오류 메시지 확인
- Supabase Table Editor에서 RLS 정책이 적용되어 있는지 확인
- Supabase Auth에서 해당 사용자가 이메일 인증 완료 상태인지 확인

## localStorage fallback 가능성

현재 코드 기준으로 `components`, `lib`, `app` 아래의 active localStorage 참조는 제거된 상태다.

최근 확인:

- `readStoredStudents`
- `writeStoredStudents`
- `studentStorageKey`
- `localStorage`

위 키워드는 `components`, `lib`, `app` 검색에서 더 이상 발견되지 않았다.

남아 있을 수 있는 것:

- 사용자 브라우저 localStorage 안에는 과거 버전에서 저장한 `industrial-student-record-ai:students`, `industrial-student-record-ai:records` 데이터가 남아 있을 수 있음
- 하지만 현재 코드에서는 학생 목록/학생부 초안 저장에 localStorage fallback을 사용하지 않음
- `.next` 캐시 또는 구버전 dev server가 살아 있으면 예전 코드가 보일 수 있으므로, 이상하면 개발 서버 재시작 필요

## 관련 파일 목록

Supabase/Auth:

- `lib/supabase.ts`
- `lib/supabase-server.ts`
- `components/LoginForm.tsx`
- `components/LogoutButton.tsx`
- `app/login/page.tsx`

학생 CRUD:

- `lib/students.ts`
- `components/StudentManager.tsx`
- `app/students/page.tsx`

작성 화면과 학생 목록 연동:

- `components/RecordComposer.tsx`
- `components/DesktopRecordComposer.tsx`
- `components/MobileRecordStepper.tsx`
- `components/GeneratedResultCard.tsx`
- `components/SelectableChipGroup.tsx`

초안 저장:

- `lib/record-drafts.ts`

DB/환경변수:

- `supabase/migrations/20260622_auth_students.sql`
- `supabase/schema.sql`
- `.env.example`
- `README.md`

생성 API 유지:

- `app/api/generate/subject-comment/route.ts`
- `app/api/generate/behavior-comment/route.ts`
- `lib/gemini.ts`

## 다음 작업자가 확인해야 할 파일

1. `supabase/migrations/20260622_auth_students.sql`
   - 실제 Supabase 프로젝트에 적용되었는지 확인
   - RLS 정책과 `handle_new_auth_user` 트리거가 정상 생성되었는지 확인

2. `lib/students.ts`
   - `ensureUserProfile()`가 실제 로그인 사용자에 대해 `public.users` row를 만들거나 읽는지 확인
   - `createStudent()` insert payload의 `school_id`, `created_by` 값 확인

3. `components/StudentManager.tsx`
   - 학생 추가/수정/삭제 후 화면 오류 메시지 확인
   - Supabase error.message를 UI에 표시하므로 실제 오류를 여기서 확인 가능

4. `components/LoginForm.tsx`
   - 회원가입 시 `school_id` metadata가 들어가는지 확인
   - 이메일 인증 설정에 따라 session 유무가 달라지는지 확인

5. `lib/supabase.ts`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_DEFAULT_SCHOOL_ID`
   - 위 값이 올바르게 읽히는지 확인. 클라이언트에서는 `NEXT_PUBLIC_DEFAULT_SCHOOL_ID`가 우선이며, 코드상 `DEFAULT_SCHOOL_ID` fallback도 둠

6. `.env.local` 및 Vercel 환경변수
   - 로컬과 Vercel이 같은 Supabase 프로젝트를 바라보는지 확인
   - 클라이언트용 publishable key와 서버용 service role key를 혼동하지 않았는지 확인

## 권장 다음 작업

1. Supabase SQL Editor에서 `20260622_auth_students.sql` 전체 적용
2. Supabase Auth에서 테스트 교사 계정 생성 또는 앱 회원가입
3. `public.users`에 해당 계정 row가 생성되었는지 확인
4. `/students`에서 학생 추가 시 표시되는 오류 메시지 확인
5. insert 실패 시 학생 관리 화면의 오류 메시지와 브라우저 console의 `[students] createStudent.insertStudent failed` 로그 확인
6. Supabase SQL Editor에서 `auth.users`, `public.users`, `public.students`의 `id`/`school_id` 매칭 확인

## 실행 명령

```bash
npm run typecheck
npm run build
npm run dev -- --port 3002
```
