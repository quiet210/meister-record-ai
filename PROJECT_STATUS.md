# Project Status

최종 업데이트: 2026-06-24

## 현재 상태 요약

공업계 마이스터고 학생부 작성 지원 플랫폼은 Next.js 15 App Router, TypeScript, TailwindCSS, Supabase Auth/DB, Gemini API, Vercel 기반으로 동작한다.

현재 앱은 회원가입/로그인, 학생 관리, 과세특 생성, 행동특성 및 종합의견 생성, 관리자 설정 기능까지 구현되어 있다. 관리자 설정값은 Supabase DB를 우선 사용하고, DB 데이터가 없거나 로딩 전이면 기존 `lib/options.ts` 상수를 fallback으로 사용한다.

## 현재 완료 기능

- Vercel 배포 완료
- Supabase Auth 완료
- 학생 CRUD 완료
- 학생 엑셀 양식 다운로드 기능 추가
- `public.students` 저장 성공 확인
- 관리자 권한 기능 완료
- 관리자 페이지 완료
- 학과 관리 완료
- 과목 관리 완료
- 체크리스트 관리 완료
- `npm run typecheck` 통과
- `npm run build` 통과

## 완료된 주요 기능

### 인증과 사용자 권한

- Supabase Auth 기반 회원가입/로그인 구현
- 회원가입 시 `user_metadata`에 `name`, `school_id` 저장
- `public.users` 프로필 생성/조회 흐름 구현
- 사용자 role 구조 구현: `admin`, `teacher`
- 관리자 전용 접근 화면 구현:
  - `/admin`
  - `/admin/departments`
  - `/admin/subjects`
  - `/admin/checklists`

### 학생 관리

- 학생 목록 조회
- 학생 추가
- 학생 수정
- 학생 삭제
- 학생 추가/수정 후 Supabase 기준 목록 재조회
- 학생 삭제 후 화면 목록 갱신
- 학생 엑셀 양식 다운로드
- `school_id` 기준 데이터 분리
- `public.students` 실제 저장 성공 확인

### 생성 기능

- 과세특 생성 화면 구현
- 행동특성 및 종합의견 생성 화면 구현
- Gemini API 기반 서버 Route 연결
- 생성 결과 복사 기능
- 생성 결과 Supabase `record_drafts` 저장 기능

### 관리자 설정 기능

- 관리자 홈 구현
- 학과 관리 구현
  - 추가
  - 수정
  - 삭제
- 과목 관리 구현
  - 추가
  - 수정
  - 삭제
- 과세특 체크리스트 관리 구현
  - 활동유형
  - 역량 키워드
- 행동특성 체크리스트 관리 구현
  - 생활태도
  - 협업
  - 리더십
  - 책임감
  - 안전의식
  - 직업윤리
- DB 우선 설정 로딩 구현
- 기존 `options.ts` 상수 fallback 구현
- 모바일/데스크톱 작성 UI에서 관리자 설정값 사용

## 현재 사용 중인 주요 테이블

- `public.users`
- `public.students`
- `public.record_drafts`
- `public.departments`
- `public.subjects`
- `public.checklist_categories`
- `public.checklist_items`

## Supabase 구조 요약

### users

Supabase Auth 사용자와 앱 프로필을 연결한다.

- `id`: `auth.users.id` 참조
- `school_id`: 학교 구분 ID
- `email`
- `name`
- `role`: `teacher` 또는 `admin`

### students

학교별 학생 정보를 저장한다.

- `school_id` 기준으로 데이터 분리
- `created_by`로 등록 교사 추적
- 학생 CRUD는 `lib/students.ts`에서 관리

### record_drafts

생성된 과세특/행동특성 초안과 입력 payload를 저장한다.

- `mode`: `subject` 또는 `behavior`
- `input_payload`
- `result_payload`
- `draft_text`

### departments

관리자가 수정할 수 있는 학교별 학과 설정이다.

- `school_id`
- `code`
- `label`
- `sort_order`

### subjects

관리자가 수정할 수 있는 학교별 과목 설정이다.

- `school_id`
- `name`
- `sort_order`

### checklist_categories

과세특/행동특성 체크리스트 분류를 저장한다.

- `mode`: `subject` 또는 `behavior`
- `key`
- `label`
- `sort_order`

### checklist_items

각 체크리스트 분류에 속한 항목을 저장한다.

- `school_id`
- `category_id`
- `label`
- `sort_order`

## 주요 마이그레이션

```bash
supabase/migrations/20260622_auth_students.sql
supabase/migrations/20260622_admin_settings.sql
```

`20260622_auth_students.sql`:

- `schools`
- `users`
- `students`
- `record_drafts`
- RLS 정책
- 신규 Auth 사용자 프로필 생성 트리거

`20260622_admin_settings.sql`:

- `departments`
- `subjects`
- `checklist_categories`
- `checklist_items`
- 관리자 전용 write RLS 정책
- 같은 학교 사용자 read RLS 정책
- 기존 학과/과목/체크리스트 기본값 seed
- 동적 학과 관리를 위한 `students.department` check constraint 제거

## 최근 해결한 문제

- GitHub 업로드 경로 문제
  - 프로젝트 루트와 업로드 대상 폴더 구조를 확인하고, GitHub 업로드 시 폴더 구조 유지가 필요하다는 점을 문서화했다.
- Vercel 빌드 오류
  - 로컬 `npm run typecheck`, `npm run build` 기준으로 검증했다.
- 관리자 페이지 빌드 오류
  - `/admin`, `/admin/departments`, `/admin/subjects`, `/admin/checklists` 라우트와 관리자 컴포넌트를 정리했다.
- `settingsOptions` 타입 오류
  - `RecordComposerViewProps`에 `settingsOptions`를 명시하고, `RecordComposer.tsx`에서 `viewProps` 생성 시 항상 포함하도록 수정했다.
  - DB 로딩 전 또는 DB 데이터가 없을 때 `getFallbackSettingsOptions()`를 통해 기존 `options.ts` 상수를 사용하도록 정리했다.
- 학생 엑셀 양식 다운로드 기능 추가
  - `/students` 화면의 학생 엑셀 업로드 영역에 `student-upload-template.xlsx` 다운로드 버튼을 추가했다.
  - 첫 번째 시트명은 `학생업로드양식`이며, 이름/학년/학과/반/번호/성별/비고 헤더와 예시 행을 포함한다.

## 주요 파일

문서:

- `README.md`
- `PROJECT_STATUS.md`

Auth/Supabase:

- `lib/supabase.ts`
- `lib/supabase-server.ts`
- `lib/students.ts`
- `components/LoginForm.tsx`
- `components/LogoutButton.tsx`
- `app/login/page.tsx`

학생 관리:

- `components/StudentManager.tsx`
- `lib/student-template.ts`
- `app/students/page.tsx`

작성 화면:

- `components/RecordComposer.tsx`
- `components/DesktopRecordComposer.tsx`
- `components/MobileRecordStepper.tsx`
- `components/GeneratedResultCard.tsx`
- `components/SelectableChipGroup.tsx`
- `app/subject-comment/page.tsx`
- `app/behavior-comment/page.tsx`

관리자 기능:

- `lib/admin-settings.ts`
- `components/AdminGuard.tsx`
- `components/AdminHome.tsx`
- `components/AdminDepartmentManager.tsx`
- `components/AdminSubjectManager.tsx`
- `components/AdminChecklistManager.tsx`
- `app/admin/page.tsx`
- `app/admin/departments/page.tsx`
- `app/admin/subjects/page.tsx`
- `app/admin/checklists/page.tsx`

생성 API:

- `app/api/generate/subject-comment/route.ts`
- `app/api/generate/behavior-comment/route.ts`
- `lib/gemini.ts`

## 실행 및 검증 명령

```bash
npm run typecheck
npm run build
npm run dev -- --port 3002
```

## 배포 상태

- Vercel 배포 완료
- Supabase Auth 및 학생 저장 흐름 동작 확인됨
- Vercel 환경변수에 Supabase 클라이언트용 값이 설정된 상태
- 현재 운영 중인 Vercel Production 배포 주소가 확정됨

```text
Production URL: https://meister-record-ai.vercel.app
GitHub: https://github.com/quiet210/meister-record-ai
```

## 다음 개발 우선순위

1. 학생 엑셀 업로드
2. 과세특 일괄 생성
3. 행동특성 일괄 생성
4. 결과 엑셀 다운로드
5. 교육과정 업로드
6. RAG 기반 생성

## 다음 채팅에서 작업할 때 주의사항

- `README.md` 먼저 읽기
- `PROJECT_STATUS.md` 먼저 읽기
- 기존 Auth 구조 수정 금지
- 기존 학생 CRUD 수정 최소화
- 관리자 기능 유지
- `settingsOptions` fallback 흐름 유지
- GitHub 업로드 시 폴더 구조 유지
- 코드 변경 후에는 `npm run typecheck`와 `npm run build` 확인

## 현재 주의할 점

- 앱 라우트 보호 미들웨어는 아직 없다.
- `/dashboard`, `/students`, `/subject-comment`, `/behavior-comment`, `/knowledge`는 페이지 자체 접근이 가능하지만 실제 데이터 작업은 로그인 사용자 확인 후 수행된다.
- 사용자 브라우저 localStorage 안에는 과거 버전 데이터가 남아 있을 수 있으나, 현재 학생 목록/학생부 초안 저장은 Supabase DB 기준이다.
- `supabase/schema.sql`은 과거 `profiles` 기반 구조가 남아 있을 수 있으므로, 실제 기준은 최신 migration 파일이다.
