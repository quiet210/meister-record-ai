# 공업계 마이스터고 학생부 작성 지원 플랫폼

공업계 마이스터고 교사가 학생부 초안을 더 빠르고 일관되게 작성할 수 있도록 돕는 웹 플랫폼입니다. 학생 정보와 학교별 설정값을 Supabase에 저장하고, Gemini API를 통해 과세특과 행동특성 및 종합의견 초안을 생성합니다.

## 프로젝트 개요

이 프로젝트는 다음 업무를 지원합니다.

- 과세특 작성: 과목, 단원, 활동유형, 역량 키워드, 교사 관찰 메모를 바탕으로 교과 세부능력 및 특기사항 초안을 생성합니다.
- 행동특성 및 종합의견 작성: 생활태도, 협업, 리더십, 책임감, 안전의식, 직업윤리 관련 체크리스트와 담임 관찰 메모를 바탕으로 초안을 생성합니다.
- 관리자 설정 기능: 학교별 학과명, 과목명, 과세특/행동특성 체크리스트를 관리자 화면에서 관리합니다.

## 기술 스택

- Next.js 15 App Router
- TypeScript
- TailwindCSS
- Supabase Auth/Database
- Gemini API
- Vercel

## 주요 기능

- 회원가입/로그인
- 학생 관리
- 학생 엑셀 양식 다운로드
- 과세특 생성
- 행동특성 생성
- 관리자 기능
- 학과 관리
- 과목 관리
- 체크리스트 관리
- Supabase 기반 학생부 초안 저장
- PDF/DOCX/TXT/CSV 지식베이스 업로드 준비
- OpenAI Vector Store 기반 RAG 구조 준비

## 주요 화면

- `/login`: Supabase Auth 로그인/회원가입
- `/dashboard`: 주요 작업 진입 대시보드
- `/students`: 학생 관리 및 학생 엑셀 양식 다운로드
- `/subject-comment`: 과세특 생성
- `/behavior-comment`: 행동특성 및 종합의견 생성
- `/knowledge`: 지식베이스 문서 업로드
- `/admin`: 관리자 설정 홈
- `/admin/departments`: 학과 관리
- `/admin/subjects`: 과목 관리
- `/admin/checklists`: 체크리스트 관리

## 실행 방법

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

기본 개발 서버:

```bash
npm run dev -- --port 3002
```

검증 명령:

```bash
npm run typecheck
npm run build
```

## 환경변수 설명

`.env.local`과 Vercel Project Settings에 동일한 값을 등록합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_DEFAULT_SCHOOL_ID=demo-school
```

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL입니다.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 브라우저에서 사용하는 Supabase publishable/anon key입니다.
- `NEXT_PUBLIC_DEFAULT_SCHOOL_ID`: 회원가입 시 학교 ID가 비어 있을 때 사용할 기본 학교 ID입니다.

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

- `GEMINI_API_KEY`: 과세특/행동특성 생성 API에서 사용하는 Gemini API 키입니다.
- `GEMINI_MODEL`: 생성에 사용할 Gemini 모델명입니다.

```bash
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=knowledge-files
DEFAULT_SCHOOL_ID=demo-school
```

- `SUPABASE_SECRET_KEY` 또는 `SUPABASE_SERVICE_ROLE_KEY`: 서버 API Route에서 Supabase 관리 작업을 수행할 때 사용하는 키입니다.
- `SUPABASE_STORAGE_BUCKET`: 지식베이스 파일 저장용 Supabase Storage bucket 이름입니다.
- `DEFAULT_SCHOOL_ID`: 서버 환경에서 사용할 기본 학교 ID입니다.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_VECTOR_STORE_ID=
```

- `OPENAI_API_KEY`: RAG/Vector Store 연동용 OpenAI API 키입니다.
- `OPENAI_MODEL`: RAG 생성에 사용할 OpenAI 모델명입니다.
- `OPENAI_VECTOR_STORE_ID`: 검색에 사용할 OpenAI Vector Store ID입니다.

## 배포 주소

- 현재 운영 중인 Vercel Production 배포 주소입니다.

```text
Production URL: https://meister-record-ai.vercel.app
GitHub: https://github.com/quiet210/meister-record-ai
```

## Supabase 구조 요약

현재 핵심 테이블:

- `public.users`: Supabase Auth 사용자와 연결되는 앱 사용자 프로필입니다. `role`은 `admin` 또는 `teacher`입니다.
- `public.students`: 학교별 학생 정보입니다.
- `public.record_drafts`: 생성된 과세특/행동특성 초안 저장 테이블입니다.
- `public.departments`: 학교별 학과 설정입니다.
- `public.subjects`: 학교별 과목 설정입니다.
- `public.checklist_categories`: 체크리스트 분류입니다.
- `public.checklist_items`: 체크리스트 항목입니다.

적용할 주요 마이그레이션:

```bash
supabase/migrations/20260622_auth_students.sql
supabase/migrations/20260622_admin_settings.sql
```

권한 구조:

- `teacher`: 학생 관리, 과세특 생성, 행동특성 생성 기능을 사용합니다.
- `admin`: teacher 기능에 더해 `/admin`, `/admin/departments`, `/admin/subjects`, `/admin/checklists`에 접근해 학교별 설정을 관리합니다.

관리자 계정 승격 예시:

```sql
update public.users
set role = 'admin'
where email = 'admin@school.kr';
```

## 개발 시 주의사항

- 새로운 Codex 채팅에서는 `README.md`와 `PROJECT_STATUS.md`를 먼저 읽고 진행합니다.
- 기존 Supabase Auth 구조를 임의로 바꾸지 않습니다.
- 기존 학생 CRUD는 최소한으로만 수정합니다.
- 관리자 기능과 `settingsOptions` fallback 흐름을 유지합니다.
- GitHub 업로드 시 현재 폴더 구조를 유지합니다.
