# 공업계 마이스터고 학생부 작성 지원 플랫폼

공업계 마이스터고 교사가 학생부 초안을 더 빠르고 일관되게 작성할 수 있도록 돕는 웹 플랫폼입니다. 학생 정보와 학교별 설정값을 Supabase에 저장하고, Gemini API를 통해 과세특과 행동특성 및 종합의견 초안을 생성합니다.

## 프로젝트 개요

이 프로젝트는 다음 업무를 지원합니다.

- 과세특 작성: 과목, 단원, 활동유형, 역량 키워드, 교사 관찰 메모를 바탕으로 교과 세부능력 및 특기사항 초안을 생성합니다.
- 행동특성 및 종합의견 작성: 생활태도, 협업, 리더십, 책임감, 안전의식, 직업윤리 관련 체크리스트와 담임 관찰 메모를 바탕으로 초안을 생성합니다.
- 관리자 설정 기능: 학교별 학과명, 과목/성취기준, 과세특/행동특성 체크리스트를 관리자 화면에서 관리합니다.

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
- 학생 엑셀 업로드
- 학생 엑셀 양식 다운로드
- 과세특 생성
- 행동특성 생성
- 관리자 기능
- 학과 관리
- 과목/성취기준 관리
- 성취기준 엑셀 업로드
- 성취기준 엑셀 양식 다운로드
- 체크리스트 관리
- Supabase 기반 학생부 초안 저장
- PDF/DOCX/TXT/CSV 지식베이스 업로드 준비
- OpenAI Vector Store 기반 RAG 구조 준비

## 현재 완료 상태

- GitHub 연동 완료
- Vercel 배포 완료
- Supabase Auth 완료
- 학생 CRUD 완료
- `public.students` 테이블 저장 성공
- 관리자 권한 `role` 기능 완료
- 관리자 페이지 `/admin` 완료
- 학과 관리 완료
- 과목/성취기준 관리 완료
- 체크리스트 관리 완료
- 성취기준 정확 중복 검사 완료
- 성취기준 유사 중복 검사 완료
- teacher 성취기준 업로드 지원 완료
- admin 과목 관리 기능 완료
- 과목 관리는 `curriculum_subjects` 중심으로 통합 완료
- 관리자 설정은 DB 값을 우선 사용하고, DB 데이터가 없거나 로딩 전이면 `lib/options.ts` 상수를 fallback으로 사용
- 학생 엑셀 업로드 완료
- 학생 엑셀 양식 다운로드 완료
- 성취기준 엑셀 업로드 완료
- 성취기준 엑셀 양식 다운로드 완료
- 과세특 생성 시 업로드된 성취기준 Gemini 프롬프트 반영 완료
- 과세특 생성 시 성취기준 관련도 기반 + seed 랜덤 분산 선택 완료

## 주요 화면

- `/login`: Supabase Auth 로그인/회원가입
- `/dashboard`: 주요 작업 진입 대시보드
- `/students`: 학생 관리, 학생 엑셀 업로드, 학생 엑셀 양식 다운로드
- `/subject-comment`: 과세특 생성
- `/behavior-comment`: 행동특성 및 종합의견 생성
- `/knowledge`: 지식베이스 문서 업로드
- `/admin`: 관리자 설정 홈
- `/admin/departments`: 학과 관리
- `/admin/subjects`: deprecated 경로이며 `/admin/curriculum`으로 리다이렉트
- `/admin/curriculum`: 과목/성취기준 관리, 성취기준 엑셀 업로드
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
- `public.subjects`: deprecated된 기존 과목 설정 테이블입니다. 즉시 삭제하지 않고 데이터 보존과 이전 호환용으로만 유지합니다.
- `public.curriculum_subjects`: 단일 과목 마스터 테이블입니다. 과목명, 교과유형, 설명, 정렬순서를 저장합니다.
- `public.curriculum_standards`: 과목별 성취기준, 단원명, 핵심키워드, 중복 처리 상태를 저장합니다.
- `public.checklist_categories`: 체크리스트 분류입니다.
- `public.checklist_items`: 체크리스트 항목입니다.

현재 성취기준 흐름:

```text
curriculum_subjects 과목
↓
성취기준 업로드
↓
curriculum_standards 저장
↓
Gemini 생성 프롬프트 반영
```

현재 상태:

- `curriculum_standards` 저장 완료
- `getCurriculumStandardsBySubject(subjectName)` 구현 완료
- 과세특 작성 화면의 과목 선택 목록은 `curriculum_subjects`를 우선 사용하고, 테이블이 없거나 로딩 실패/빈 결과이면 `lib/options.ts` 상수를 fallback으로 사용
- 성취기준 업로드는 `curriculum_subjects.school_id + subject_name`을 기준으로 과목을 매칭
- 과세특 생성 시 선택 과목 기준 active 성취기준 전체 후보를 조회하고, 학생 입력값과의 관련도 및 seed 기반 랜덤성을 적용해 최대 3개를 Gemini 프롬프트에 반영
- 성취기준 후보가 3개 이하이면 전부 사용하고, 후보가 없거나 조회를 건너뛰면 기존 과세특 생성 흐름으로 계속 동작

적용할 주요 마이그레이션:

```bash
supabase/migrations/20260622_auth_students.sql
supabase/migrations/20260622_admin_settings.sql
supabase/migrations/20260624_curriculum.sql
supabase/migrations/20260625_unify_subject_master.sql
```

권한 구조:

- `teacher`: 학생 관리, 과세특 생성, 행동특성 생성 기능을 사용합니다.
- `admin`: teacher 기능에 더해 `/admin`, `/admin/departments`, `/admin/curriculum`, `/admin/checklists`에 접근해 학교별 설정을 관리합니다. `/admin/subjects`는 별도 과목 관리 화면으로 사용하지 않고 `/admin/curriculum`으로 이동합니다.
- 성취기준 업로드는 `teacher`와 `admin` 모두 가능하며, 과목 생성/수정/삭제는 `admin`만 가능합니다.

관리자 계정 승격 예시:

```sql
update public.users
set role = 'admin'
where email = 'admin@school.kr';
```

## 다음 작업 후보

### 중요한 설계 결정

- 교과서 PDF 업로드는 파일 용량과 저작권 문제 때문에 제외합니다.
- 과목 관리는 `curriculum_subjects`를 단일 마스터로 사용합니다.
- `subjects` 테이블은 deprecated 상태이며 즉시 삭제하지 않습니다.
- 과세특 과목 선택, 성취기준 업로드 매칭, 성취기준 검색은 모두 `curriculum_subjects`와 `curriculum_standards` 기준으로 동작합니다.
- `/admin/subjects`는 더 이상 별도 과목 관리 화면으로 사용하지 않습니다.
- 성취기준, 단원명, 핵심키워드만 관리합니다.
- teacher도 성취기준 업로드가 가능합니다.
- admin만 과목 생성, 수정, 삭제를 수행합니다.
- 중복 업로드 방지를 위해 정확 중복과 유사 중복 검사를 모두 수행합니다.
- 성취기준 업로드 엑셀 컬럼은 `과목명`, `교과유형`, `단원명`, `성취기준`, `핵심키워드`입니다.
- `교과유형`은 `일반교과`, `NCS교과`, `general`, `ncs`를 허용합니다.
- 정확 중복 기준은 `school_id`, `subject_name`, `unit_name`, `achievement_standard`입니다.
- 유사 중복은 성취기준 텍스트 정규화 후 includes 관계와 85% 이상 문자열 유사도로 감지합니다.
- 과세특 성취기준 선택은 단원명, 교사 관찰 메모, 활동 유형, 역량 키워드, 보완점, 과목명을 입력 신호로 사용합니다.
- 성취기준 선택 seed는 사용 가능한 `selectedStudentId`, `student_no`, 학생 이름, 현재 날짜를 조합합니다.

### 1순위 다음 작업

성취기준 프롬프트 반영 흐름을 향후 RAG 검색 기반으로 확장할 수 있습니다.

```text
과목 선택
↓
curriculum_standards 조회
↓
관련도 기반 후보군 구성
↓
학생별 seed 랜덤 분산 선택
↓
Gemini 프롬프트 주입
↓
과세특 생성
↓
향후 Vector Store/RAG 검색과 통합
```

- 성취기준 업로드 기능, 과세특 생성 프롬프트 반영, 학생별 분산 선택은 완료됐습니다.
- 다음 단계에서는 현재 관련도 계산을 벡터 검색/RAG와 통합해 검색 품질을 높일 수 있습니다.

## 개발 시 주의사항

- 새로운 Codex 채팅에서는 `README.md`와 `PROJECT_STATUS.md`를 먼저 읽고 진행합니다.
- 기존 Supabase Auth 구조를 임의로 바꾸지 않습니다.
- 기존 학생 CRUD는 최소한으로만 수정합니다.
- 관리자 기능과 `settingsOptions` fallback 흐름을 유지합니다.
- GitHub 업로드 시 현재 폴더 구조를 유지합니다.
