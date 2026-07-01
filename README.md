# 공업계 마이스터고 학생부 작성 지원 플랫폼

공업계 마이스터고 교사가 학생부 초안을 더 빠르고 일관되게 작성할 수 있도록 돕는 웹 플랫폼입니다. 학생 정보와 학교별 설정값을 Supabase에 저장하고, Gemini API를 통해 과세특과 행동특성 및 종합의견 초안을 생성한 뒤 교사 수정본과 최종본까지 관리합니다.

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
- 과세특 일괄 생성
- 과세특 일괄 생성 결과 엑셀 다운로드
- 과세특 생성 결과 편집, AI 원본 비교, 최종본 확정
- 행동특성 생성
- 행동특성 일괄 생성
- 행동특성 일괄 생성 결과 엑셀 다운로드
- 행동특성 생성 결과 편집, AI 원본 비교, 최종본 확정
- 학생별 학생부 관리
- AI 생성 결과 중복도 분석
- 중복 의심 학생 선택 재생성
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
- 과세특 일괄 생성 화면 `/bulk-subject-comment` 추가 완료
- 과세특 일괄 생성 시 학생별 payload를 기존 과세특 생성 API로 호출하고 동시 호출 수를 3개로 제한
- 과세특 일괄 생성 결과를 학생별로 표시하고 `record_drafts`에 자동 저장
- `/bulk-subject-comment` 레이아웃을 학생별 입력 테이블 중심으로 개선 완료
- 행동특성 및 종합의견 일괄 생성 화면 `/bulk-behavior-comment` 추가 완료
- 행동특성 일괄 생성 시 학생별 payload를 기존 행동특성 생성 API로 호출하고 동시 호출 수를 3개로 제한
- 행동특성 일괄 생성 성공 결과를 `record_drafts`에 `mode=behavior`로 자동 저장
- 행동특성 일괄 생성 payload 매핑 수정 완료: 화면의 생활태도 키워드/협업·관계/책임감·성실성 선택값은 `industrialAttitudes`로 전달하고, `schoolLifeAreas`에는 학교생활 영역만 전달
- 과세특/행동특성 일괄 생성 완료 후 이번 생성 묶음 안에서 초안 유사도 자동 분석 완료
- 생성 결과 영역에 학생명, 유사도, 상태, 복사, 재생성 UI 표시 완료
- 유사도 85% 이상은 빨간색 `중복 의심`, 70~84%는 노란색 `유사`, 70% 미만은 정상으로 표시
- 중복 의심 학생만 체크박스로 선택해 기존 생성 API를 다시 호출하는 선택 재생성 기능 완료
- 재생성 결과는 `record_drafts`의 최신 학생별 초안 row를 업데이트하도록 저장 경로 보강 완료
- 과세특 일괄 생성 결과 엑셀 다운로드 완료
- 행특 일괄 생성 결과 엑셀 다운로드 완료
- 과세특/행동특성 단일 생성 결과 편집기 추가 완료
- 과세특/행동특성 일괄 생성 결과 학생별 편집기 추가 완료
- `record_drafts` lifecycle 적용 완료: AI 원본, 교사 수정본, 최종본
- `record_drafts` 확장 구조 적용 완료: `ai_content`, `edited_content`, `final_content`, `status`, `edited_at`, `finalized_at`, `edited_by`
- 교사 수정본 3초 자동 저장 및 명시적 수정 저장 완료
- `AI 원본 보기`로 AI 원본과 현재 수정본 비교 완료
- `최종 확정` / `최종 해제` 흐름 완료
- 복사와 엑셀 다운로드의 최종본 선택 규칙 적용 완료
- 학생별 학생부 관리 화면 `/student-records` 추가 완료
- `/student-records`에서 좌측 학생 목록 검색, 학년/학과/반 필터, 우측 과세특/행특 카드형 상세 표시 완료
- 과세특/행특 카드별 현재 상태, AI 생성 여부, 수정본 여부, 최종본 여부, 생성일, 최종 수정일 표시 완료
- 학생부 카드별 AI 원본/수정본/최종본 탭 전환과 생성 이력 Timeline 표시 완료
- 학생부 카드별 복사, AI 다시 생성, 최종 확정, 최종 해제 액션 연결 완료
- 학생부 관리 화면의 복사는 `final_content` → `edited_content` → `ai_content` → `draft_text` 순서의 최종본 선택 규칙을 사용
- Supabase migration `20260630_record_draft_lifecycle.sql` 적용 완료
- Vercel Production 배포 완료
- 데스크톱 레이아웃 가로 스크롤 문제 개선 완료
- `AppShell`과 주요 콘텐츠 영역을 일반 웹 애플리케이션 형태의 반응형 레이아웃으로 정리 완료
- `DesktopRecordComposer` 결과 패널과 입력 영역의 데스크톱 반응형 폭 개선 완료
- `StudentManager`와 `CurriculumManager`의 반응형 grid/min-width 구조 개선 완료
- 학생별 입력 테이블은 페이지 전체가 아니라 테이블 컨테이너 내부에서만 가로 스크롤되도록 조정 완료
- `/dashboard`, `/bulk-subject-comment`, `/bulk-behavior-comment` Tailwind 스타일 및 레이아웃 정상 표시 확인 완료
- Vercel TypeScript 빌드 오류 대응 완료
- `npm run typecheck` 통과
- `npm run build` 통과

## 현재 프로젝트 진행률

현재 진행률은 약 97%입니다.

- 핵심 작성 흐름: 과세특/행동특성 단일 생성과 일괄 생성 완료
- 데이터 관리: 학생 CRUD, 관리자 설정, 과목/성취기준, 체크리스트 관리 완료
- 저장 흐름: 생성 결과 `record_drafts` 저장, 교사 수정본 저장, 최종본 확정 완료
- 학생별 관리: `/student-records`에서 학생별 과세특/행특 AI 원본, 수정본, 최종본, 생성 이력 조회 완료
- 품질 관리: 생성 결과 유사도 분석, 유사/중복 의심 표시, 선택 재생성 완료
- 내보내기: 과세특/행특 일괄 생성 결과 엑셀 다운로드 완료, `final_content → edited_content → ai_content → draft_text` 선택 규칙 적용 완료
- 남은 주요 작업: 생성 이력 전용 관리, 나이스 붙여넣기용 엑셀 다운로드 고도화, RAG 고도화

## 주요 화면

- `/login`: Supabase Auth 로그인/회원가입
- `/dashboard`: 주요 작업 진입 대시보드
- `/students`: 학생 관리, 학생 엑셀 업로드, 학생 엑셀 양식 다운로드
- `/student-records`: 학생별 과세특/행특 AI 원본, 수정본, 최종본, 생성 이력 관리
- `/subject-comment`: 과세특 생성
- `/bulk-subject-comment`: 과세특 일괄 생성
- `/behavior-comment`: 행동특성 및 종합의견 생성
- `/bulk-behavior-comment`: 행동특성 및 종합의견 일괄 생성
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

로컬 개발 서버 주의:

- `npm run build`를 실행할 때 기존 `next dev` 서버가 같은 프로젝트의 `.next` 산출물을 사용 중이면 개발 서버 화면의 CSS/청크가 일시적으로 깨질 수 있습니다.
- 빌드 검증 후 개발 화면이 기본 HTML처럼 보이면 기존 dev 서버를 종료하고 `npm run dev -- --port 3002`로 다시 실행합니다.
- 가로 스크롤 검증은 `/dashboard`, `/bulk-subject-comment`, `/bulk-behavior-comment`에서 페이지 전체 overflow가 없는지 확인합니다. 일괄 입력 테이블은 필요한 경우 테이블 내부에서만 가로 스크롤됩니다.

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
- `public.record_drafts`: 과세특/행동특성 AI 원본, 교사 수정본, 최종본과 lifecycle 상태를 저장합니다. `ai_content`, `edited_content`, `final_content`를 사용하고 기존 `draft_text`는 호환용 fallback으로 유지합니다.
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
- `getCurriculumStandardsBySubject(subjectName, { schoolId, limit })`는 선택적 `limit` 옵션을 지원해 이전 호출 방식과도 호환
- 과세특 작성 화면의 과목 선택 목록은 `curriculum_subjects`를 우선 사용하고, 테이블이 없거나 로딩 실패/빈 결과이면 `lib/options.ts` 상수를 fallback으로 사용
- 성취기준 업로드는 `curriculum_subjects.school_id + subject_name`을 기준으로 과목을 매칭
- 과세특 생성 시 선택 과목 기준 active 성취기준 전체 후보를 조회하고, 학생 입력값과의 관련도 및 seed 기반 랜덤성을 적용해 최대 3개를 Gemini 프롬프트에 반영
- 과세특 일괄 생성은 학생별 `selectedStudentId`, `studentNo`, 이름, 학년, 학과와 개별 활동유형/역량/보완점/교사 관찰 메모를 payload에 포함해 기존 과세특 생성 API를 재사용
- 과세특 일괄 생성 화면은 공통 설정을 상단에 두고, 학생별 입력 테이블에서 선택 체크박스/활동유형/역량키워드/보완점/교사 관찰 메모/상태/작업을 한 행에서 바로 처리
- 생성 결과는 학생별 입력 테이블 아래 별도 영역에 표시하고, 학생명/유사도/복사/저장/AI 원본 비교/AI 다시 생성/최종 확정/상태를 함께 확인할 수 있음
- 행동특성 일괄 생성은 `/bulk-behavior-comment`에서 학년/반/학과 필터와 분량/문체/작성 관점을 공통 설정으로 관리
- 행동특성 일괄 생성 화면은 학생별 입력 테이블에서 학교생활 영역, 생활태도 키워드, 협업/관계, 책임감/성실성, 보완점, 담임 관찰 메모를 한 행에서 직접 입력
- 행동특성 일괄 생성은 기존 `/api/generate/behavior-comment` API를 학생별로 재사용하며, 브라우저에서 동시 실행 수를 3개로 제한하고 성공 시 `record_drafts.mode = behavior`로 저장
- 행동특성 일괄 생성 payload는 `schoolLifeAreas`와 `industrialAttitudes`를 분리해 전달한다. 학교생활 영역은 `schoolLifeAreas`에만 넣고, 생활태도 키워드/협업·관계/책임감·성실성 선택값은 합쳐서 `industrialAttitudes`에 넣는다.
- 과세특/행동특성 일괄 생성이 끝나면 이번 생성에서 성공한 학생 초안만 대상으로 학생 이름을 제거한 텍스트를 문자 2~3gram/단어 벡터로 변환하고 cosine similarity를 계산
- 각 학생은 같은 생성 묶음 안에서 가장 유사한 다른 학생과의 최고 유사도를 표시
- 품질 상태 기준은 85% 이상 `중복 의심`, 70~84% `유사`, 70% 미만 `정상`
- `중복 의심` 학생만 결과 영역의 체크박스로 선택 가능하며, `선택 학생 재생성`은 기존 과세특/행동특성 생성 API를 다시 호출해 새 AI 결과 후보를 표시
- 선택 재생성은 기존 성취기준 조회, 관련도 기반 선택, 학생 seed 기반 분산 로직을 변경하지 않고 기존 payload로 재호출
- AI 다시 생성 결과는 기존 교사 수정본을 덮어쓰지 않고 `현재 유지` 또는 `새 결과 사용` 선택 후에만 교사 수정본으로 저장
- 복사와 엑셀 다운로드는 `final_content` → `edited_content` → `ai_content` → `draft_text` 순서로 출력 내용을 선택
- 학생별 학생부 관리 화면 `/student-records`는 `students`와 `record_drafts`를 함께 조회해 좌측에는 학생 검색/필터 목록, 우측에는 선택 학생의 과세특/행특 카드와 Timeline을 표시
- `/student-records`는 `record_drafts.student_id + mode(subject/behavior)` 기준으로 최신 row를 카드에 표시하고, 같은 학생/mode의 전체 row를 생성 이력 Timeline으로 구성
- `/student-records`의 복사, 최종 확정, 최종 해제는 기존 lifecycle 저장 함수와 `final_content` 우선 선택 규칙을 그대로 사용
- 성취기준 후보가 3개 이하이면 전부 사용하고, 후보가 없거나 조회를 건너뛰면 기존 과세특 생성 흐름으로 계속 동작

적용 완료된 주요 마이그레이션:

```bash
supabase/migrations/20260622_auth_students.sql
supabase/migrations/20260622_admin_settings.sql
supabase/migrations/20260624_curriculum.sql
supabase/migrations/20260625_unify_subject_master.sql
supabase/migrations/20260629_record_draft_quality_updates.sql
supabase/migrations/20260630_record_draft_lifecycle.sql
```

`20260630_record_draft_lifecycle.sql`은 `record_drafts`에 `ai_content`, `edited_content`, `final_content`, `status`, `edited_at`, `finalized_at`, `edited_by`를 추가하고 기존 `draft_text`를 AI 원본/수정본으로 backfill합니다.

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

1. 생성 이력 관리 화면
2. 나이스 붙여넣기용 엑셀 다운로드 고도화
3. RAG 고도화
4. 관리자 통계 대시보드

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
- `GetCurriculumStandardsBySubjectOptions`는 `schoolId`와 선택적 `limit`을 허용합니다. 과세특 생성의 기본 경로는 전체 후보 조회 후 관련도/분산 선택을 수행합니다.
- 과세특 일괄 생성은 기존 단일 과세특 생성 API를 학생별로 재사용하며, 브라우저에서 동시 실행 수를 3개로 제한합니다.
- `/bulk-subject-comment` 화면 우선순위는 공통 설정, 학생별 입력 테이블, 생성 버튼, 생성 결과, 일괄 적용 보조 기능 순서입니다.
- 행동특성 일괄 생성은 기존 단일 행동특성 생성 API를 학생별로 재사용하며, 브라우저에서 동시 실행 수를 3개로 제한합니다.
- `/bulk-behavior-comment`에는 과목명, 단원명, 성취기준 입력을 두지 않고 학생별 생활 관찰 입력만 사용합니다.
- 생성 품질 관리는 기존 생성 API, 학생 CRUD, 관리자 기능, 성취기준 조회 로직을 수정하지 않고 일괄 생성 결과 후처리와 저장 옵션으로만 연결합니다.
- 중복도 분석 대상은 이번 생성에서 성공한 학생 초안으로 제한합니다.
- 중복 의심 선택 재생성은 기존 payload로 같은 생성 API를 재호출하고, 새 AI 결과 후보를 표시한 뒤 교사가 `새 결과 사용`을 선택할 때만 `edited_content`에 저장합니다.
- 학생별 학생부 관리 화면은 기존 생성 API, 학생 CRUD, 관리자 기능, 성취기준 조회, 일괄 생성, 중복도 분석, 엑셀 다운로드 로직을 수정하지 않고 별도 조회/관리 페이지로 추가합니다.
- `/student-records`는 학생 목록을 `students` 기준으로 조회하고, 학생부 기록은 `record_drafts.student_id + mode` 기준으로 묶어서 표시합니다.
- 학생부 관리 화면의 Timeline은 `created_at`을 AI 생성, `edited_at`을 수정 저장, `finalized_at`을 최종 확정 이벤트로 변환해 시간순으로 표시합니다.
- 과세특 일괄 생성 결과 엑셀 다운로드 완료: 파일명은 `subject-comments-results.xlsx`, 시트명은 `과세특결과`입니다.
- 행특 일괄 생성 결과 엑셀 다운로드 완료: 파일명은 `behavior-comments-results.xlsx`, 시트명은 `행특결과`입니다.
- 데스크톱 레이아웃은 `AppShell`의 넓은 앱 컨테이너, `main min-w-0`, 반응형 grid/flex, 내부 테이블 스크롤을 기준으로 유지합니다.
- Tailwind 전역 import(`@tailwind base`, `@tailwind components`, `@tailwind utilities`)는 `app/globals.css`에서 유지합니다.

### 다음 작업 예정

현재 다음 작업 후보는 다음 순서입니다.

1. 생성 이력 관리 화면
2. 나이스 붙여넣기용 엑셀 다운로드 고도화
3. RAG 고도화
4. 관리자 통계 대시보드

RAG 고도화 단계에서는 성취기준 프롬프트 반영 흐름을 향후 검색 기반으로 확장할 수 있습니다.

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
- 과세특/행동특성 일괄 생성, 품질 관리, 결과 엑셀 다운로드, 학생별 학생부 관리 화면은 완료됐습니다.

## 개발 시 주의사항

- 새로운 Codex 채팅에서는 `README.md`와 `PROJECT_STATUS.md`를 먼저 읽고 진행합니다.
- 기존 Supabase Auth 구조를 임의로 바꾸지 않습니다.
- 기존 학생 CRUD는 최소한으로만 수정합니다.
- 관리자 기능과 `settingsOptions` fallback 흐름을 유지합니다.
- GitHub 업로드 시 현재 폴더 구조를 유지합니다.
- 코드 변경 후에는 `npm run typecheck`와 `npm run build`를 확인합니다.
- `npm run build` 후 개발 서버 화면 스타일이 깨지면 dev 서버를 재시작합니다.
