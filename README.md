# 공업계 마이스터고 학생부 작성 지원 플랫폼

## 1. 프로젝트 소개

### 프로젝트 목적

공업계 마이스터고 교사가 학생부 초안을 빠르고 일관되게 작성할 수 있도록 돕는 웹 플랫폼입니다. 학생 정보, 학교별 설정, 과목과 성취기준, 체크리스트를 Supabase에 저장하고, RAG 기반 근거 검색과 Gemini 생성 API를 활용해 과세특과 행동특성 및 종합의견 초안을 생성합니다.

생성된 초안은 바로 최종본이 아니라 교사가 수정하고 확정하는 작업 흐름을 전제로 합니다. 따라서 이 프로젝트의 핵심은 AI 생성뿐 아니라 `AI 원본 -> 교사 수정본 -> 최종본`으로 이어지는 학생부 작성 lifecycle 관리입니다.

### 주요 기능

- 회원가입과 로그인
- 학생 CRUD
- 학생 엑셀 업로드와 템플릿 다운로드
- 과목 관리
- 학습모듈 기반 성취기준 엑셀 업로드, 과목 자동 등록, 중복 검사
- NCS교과 학습모듈 선택 기반 과세특 단일/일괄 생성
- 과세특 단일 생성
- 행동특성 및 종합의견 단일 생성
- 과세특 일괄 생성
- 행동특성 및 종합의견 일괄 생성
- 생성 결과 중복도 분석
- 중복 의심 학생 선택 재생성
- AI 원본, 수정본, 최종본 lifecycle 관리
- 교사 수정본 자동 저장
- 학생별 학생부 관리
- 과세특/행특 결과 엑셀 다운로드
- 관리자 설정 관리

### 대상 사용자

- 공업계 마이스터고 교사
- 담임교사
- 교과 담당 교사
- 학교 관리자
- 학생부 작성 업무를 보조하는 교무/교육과정 담당자

## 2. 현재 구현 기능

### 회원

- Supabase Auth 기반 회원가입/로그인
- 회원가입 시 사용자 이름과 학교 ID 저장
- `public.users` 프로필과 Supabase Auth 사용자 연결
- `admin`, `teacher` role 기반 권한 분리
- 일반 사용자는 본인 프로필만 조회하고, 관리자는 같은 학교 사용자 프로필과 role만 관리

### 학생 관리

- 학생 목록 조회
- 학생 관리 화면 최초 진입 시 목록을 숨기고, 학년과 학과 선택 후 목록 표시
- 학년/학과 필수 필터와 반 멀티셀렉트, 이름 검색 유지
- 학생 추가, 수정, 삭제
- 학년, 학과, 반, 번호, 이름 관리
- 학생 엑셀 업로드
- 학생 업로드 템플릿 다운로드
- 학교 ID 기준 학생 데이터 분리 및 같은 학교 교사 간 공유

### 과목 관리

- 관리자 과목 관리 화면 제공
- `curriculum_subjects` 중심의 과목 마스터 관리
- 과목명, 교과유형, 설명, 정렬순서 관리
- 성취기준 업로드 시 엑셀 과목명을 기준으로 미등록 과목 자동 등록
- 엑셀 내 동일 과목 반복 행은 과목 1개로만 자동 등록
- 과목/성취기준 관리 화면은 전체 목록을 최초부터 펼치지 않고 과목명 검색, 교과유형 필터, 조회 버튼 기반으로 과목을 표시
- 조회 결과에서 과목별 성취기준 개수와 학습모듈 개수를 확인하고 선택 과목의 성취기준 상세 조회
- 기존 `subjects` 테이블은 deprecated 호환용으로 유지

### 성취기준 관리

- 성취기준 엑셀 업로드
- 업로드 전 미리보기
- 학습모듈명 컬럼 지원
- 핵심키워드 선택 입력 지원
- 엑셀 과목명 trim, 연속 공백 정리, 대소문자 무시 비교 기반 과목 자동 매칭
- 미등록 과목은 저장 단계에서 `curriculum_subjects`에 자동 등록
- 엑셀 내 동일 과목 중복 자동 등록 방지
- 같은 과목명에 일반교과/NCS교과가 섞인 경우 과목 교과유형 충돌로 차단
- NCS교과 학습모듈명 누락 권장 경고
- 학교, 과목, 학습모듈, 단원, 성취기준 기준 정확 중복 검사
- 동일 과목/학습모듈/단원 내 유사 중복 검사
- 기존 과목 사용, 신규 과목 자동 등록 예정, 정확 중복, 유사 중복 의심, 과목 교과유형 충돌, 오류 행 분리 표시
- `curriculum_standards` 저장
- 선택 과목 기준 성취기준 조회
- 선택 과목의 성취기준을 학습모듈별로 그룹 표시하고, 학습모듈이 없으면 "학습모듈 없음" 그룹으로 정리
- 학습모듈 그룹 접기/펼치기로 대량 성취기준 목록 표시 길이 제어
- 과세특 생성 시 선택 과목의 active 성취기준 후보 조회

### 과세특

- 학생 선택 후 과목, 학습모듈, 단원, 활동유형, 역량키워드, 보완점, 교사 관찰 메모를 입력해 과세특 초안 생성
- 과목 선택 시 `curriculum_subjects.subject_type`을 함께 확인해 일반교과(`general`)와 NCS교과(`ncs`)를 판정
- 과목 선택 UI는 `curriculum_subjects` 전체 목록 또는 fallback 전체 목록을 options로 유지하고, 선택 과목명은 value로만 관리
- 생성 API는 로그인 토큰으로 서버에서 확인한 학교 ID만 사용해 성취기준을 조회
- 일반교과는 학습모듈 선택 UI를 비활성화하고 “일반교과는 학습모듈을 사용하지 않습니다.” 안내 표시
- 과목이 바뀌면 기존 학습모듈 선택값과 성취기준 preview 상태를 초기화
- NCS교과는 선택 과목의 active `curriculum_standards.learning_module` 전체 목록을 다시 불러오며, 중복 학습모듈명과 빈 값은 제외
- 학습모듈 선택 시 해당 모듈의 단원명 후보를 제공하고, 단원명이 하나면 단원 입력칸에 자동 입력
- 학습모듈 선택 시 단원명 자동완성 후보를 제공하되, 단원명 입력값으로 후보 목록 자체를 덮어쓰지 않음
- 학습모듈 선택 시 학습모듈명, 단원명, 성취기준, 핵심키워드 기준 참고 성취기준을 최대 5개 미리보기로 표시
- 활동유형, 역량키워드, 보완점은 필수 선택이 아니며, 교사 관찰 메모 또는 선택 항목 중 하나 이상 있으면 생성 가능
- 성취기준 후보는 학습모듈이 선택되면 `subject_name + learning_module` 기준으로 우선 조회하고, 없으면 기존 `subject_name` 기준으로 fallback
- 성취기준 후보를 학습모듈, 단원명, 성취기준, 핵심키워드 순서의 관련도 기반으로 선별하고 Gemini 프롬프트에 반영
- 생성 결과를 `record_drafts`에 AI 원본으로 저장
- AI 원본 보기, 교사 수정, AI 다시 생성, 최종 확정 지원

### 행동특성

- 학생 선택 후 학교생활 영역, 생활태도, 협업/관계, 책임감/성실성, 보완점, 담임 관찰 메모를 입력해 행동특성 및 종합의견 초안 생성
- 생활태도, 협업, 책임감, 보완점은 필수 선택이 아니며, 담임 관찰 메모 또는 선택 항목 중 하나 이상 있으면 생성 가능
- 학교생활 전반, 관계, 책임감, 성실성, 진로태도, 안전의식, 직업윤리 중심 문체로 생성
- 생성 결과를 `record_drafts`에 AI 원본으로 저장
- AI 원본 보기, 교사 수정, AI 다시 생성, 최종 확정 지원

### 일괄 생성

- `/bulk-subject-comment`에서 과세특 일괄 생성
- `/bulk-behavior-comment`에서 행동특성 일괄 생성
- 과세특 일괄 생성 공통 설정에서 과목 유형에 따라 학습모듈 선택 UI 활성/비활성 적용
- 과세특 일괄 생성 공통 과목 선택도 전체 과목 options를 유지하고 선택값만 value로 관리
- 과세특 일괄 생성에서 선택한 학습모듈은 모든 선택 학생의 생성 payload에 공통 적용
- 과세특 일괄 생성은 학년, 학과, 여러 반 선택 필터로 동일 교과목을 수강하는 여러 반 학생을 함께 표시
- 과세특/행특 일괄 생성은 조회 전 학생 입력 테이블을 표시하지 않고 공통 `StudentFilter`로 학년 -> 학과 -> 반 순서의 조회 UX를 사용
- 과세특 일괄 생성은 한 번에 선택 가능한 학생 수를 최대 50명으로 제한
- 과세특 필터 학생 전체 선택은 필터 결과 또는 기존 선택 합산이 50명을 초과하면 차단하고 안내 문구 표시
- 학생 필터의 학년, 학과, 반 선택 UI는 현재 선택값으로 options 배열을 재구성하지 않음
- 학생 다중 선택
- 학생별 입력 테이블 제공
- 학생별 입력값 개별 관리
- 선택 학생에게 값 일괄 적용
- 이전 학생 값 복사
- 동시 생성 수 3개 제한
- 실패 학생 재생성
- 중복 의심 학생 선택 재생성
- 단일 생성 API를 학생별로 재사용
- 행동특성 및 종합의견 일괄 생성은 학년/학과 필수 조회와 반 멀티셀렉트 구조 적용

### 학생부 관리

- `/student-records`에서 학생별 과세특/행특 현재본 확인
- 현재 로그인한 교사의 `record_drafts.user_id`에 해당하는 학생부만 조회
- 기본 조회는 `is_current = true`인 현재본만 대상으로 하며, 전체 이력 보기는 이후 확장할 수 있도록 구조를 유지
- 좌측 학생 목록 검색과 공통 `StudentFilter` 기반 학년/학과/반 필터
- 학생 목록은 학년과 학과를 선택한 뒤 표시하고, 학생 선택 전에는 우측 상세를 표시하지 않음
- 우측 학생별 카드형 상세
- 과세특은 과목별 현재본을 별도 카드로 표시
- 행특은 학생별 `mode = behavior` 현재본 1개를 표시
- 과세특/행특 각각 AI 원본, 수정본, 최종본 탭 제공
- 생성, 수정 저장, 최종 확정 이력을 timeline으로 표시
- 학생부 카드에서 복사, AI 다시 생성, 최종 확정, 최종 해제 가능

### Lifecycle

- `record_drafts` 중심 lifecycle 적용
- `record_drafts.user_id`를 교사 소유자 기준으로 사용하며 조회, 수정, 최종 확정은 항상 현재 로그인 사용자로 제한
- 현재본 기준 컬럼: `is_current`, `version_no`, `academic_year`, `semester`, `subject_name`, `parent_draft_id`
- 현재본 판단 기준: `user_id + school_id + student_id + mode + subject_name + academic_year + semester`
- 같은 기준의 현재본이 있으면 새 AI 생성 결과는 새 row를 만들지 않고 현재 row를 갱신
- 현재본이 `finalized` 상태이면 새 AI 생성 결과로 자동 덮어쓰지 않고, 최종 확정 해제 또는 새 AI 결과 사용 같은 명시적 사용자 흐름을 요구
- 자동 저장, 수동 저장, 최종 확정, 최종 해제는 `draft_id`가 있으면 해당 row를 먼저 update하고, `draft_id`가 없을 때만 현재본 기준으로 fallback
- `ai_content`: AI 원본
- `edited_content`: 교사 수정본
- `final_content`: 최종본
- `status`: `ai_generated`, `editing`, `saved`, `finalized`
- `edited_at`, `finalized_at`, `edited_by` 저장
- 최종 출력 선택 규칙은 `final_content -> edited_content -> ai_content -> draft_text`

### 중복도 분석

- 일괄 생성 완료 후 같은 생성 묶음 안의 성공 초안 비교
- 학생 이름을 제거한 텍스트 기준 분석
- 단어 토큰과 문자 n-gram 기반 cosine similarity 계산
- 85% 이상: 중복 의심
- 70~84%: 유사
- 70% 미만: 정상
- 중복 의심 학생만 선택해 AI 다시 생성 가능

### 엑셀 다운로드

- 과세특 일괄 생성 결과 엑셀 다운로드
- 행동특성 일괄 생성 결과 엑셀 다운로드
- 최종본 선택 규칙을 적용해 다운로드 내용 결정
- 생성 결과가 기존 현재본을 갱신한 경우에도 화면의 현재본 상태를 기준으로 다운로드와 복사를 수행
- 실패 항목은 생성 상태를 실패로 표시하고 결과 칸은 비움

### 관리자 기능

- 관리자 홈
- 학과 관리
- 과목/성취기준 관리
- 체크리스트 관리
- 과세특 활동유형/역량키워드/보완점 관리
- 행동특성 생활태도/협업/리더십/책임감/안전의식/직업윤리 계열 항목 관리
- DB 설정값 우선 사용, 없으면 `lib/options.ts` fallback 사용

## 3. 프로젝트 구조

### app/

Next.js App Router 라우트와 API Route가 들어 있습니다.

- `app/login`: 로그인/회원가입
- `app/dashboard`: 작업 진입 대시보드
- `app/subject-comment`: 과세특 단일 생성
- `app/behavior-comment`: 행동특성 단일 생성
- `app/bulk-subject-comment`: 과세특 일괄 생성
- `app/bulk-behavior-comment`: 행동특성 일괄 생성
- `app/students`: 학생 관리
- `app/student-records`: 학생별 학생부 관리
- `app/knowledge`: 지식베이스 업로드
- `app/admin`: 관리자 홈
- `app/admin/curriculum`: 과목/성취기준 관리
- `app/admin/departments`: 학과 관리
- `app/admin/checklists`: 체크리스트 관리
- `app/api/generate/subject-comment`: 과세특 생성 API
- `app/api/generate/behavior-comment`: 행동특성 생성 API
- `app/api/curriculum/upload`: 성취기준 업로드 저장 API, 과목 자동 등록과 성취기준 upsert 처리
- `app/api/knowledge/upload`: 지식베이스 업로드 API

### components/

화면 단위 UI와 업무 컴포넌트가 들어 있습니다.

- `RecordComposer`: 단일 과세특/행특 생성 상태와 저장 흐름 관리
- `DesktopRecordComposer`, `MobileRecordStepper`: 단일 생성 반응형 UI
- `StudentFilter`: 학생 조회 공통 필터. 학년 -> 학과 -> 반 순서, 반 멀티셀렉트 드롭다운, 선택 반 chip, 조건 초기화 제공
- `SubjectSelect`: 과목 선택 공통 select. 전체 과목 options와 선택 value를 분리해 관리
- `SubjectLearningModuleControls`, `useSubjectLearningModule`: 과세특 학습모듈 선택, 단원 후보, 성취기준 미리보기 공통 처리
- `BulkSubjectCommentComposer`: 과세특 일괄 생성
- `BulkBehaviorCommentComposer`: 행특 일괄 생성
- `BulkDraftLifecycleEditor`: 일괄 생성 결과 lifecycle 편집
- `GeneratedResultCard`: 단일 생성 결과 편집/저장/확정 카드
- `StudentManager`: 학생 CRUD와 엑셀 업로드, 학년/학과 선택 기반 목록 표시
- `StudentRecordCenter`: 학생별 학생부 관리
- `CurriculumManager`: 과목/성취기준 관리
- `AdminChecklistManager`, `AdminDepartmentManager`: 관리자 설정
- `AppShell`: 공통 앱 레이아웃

### lib/

도메인 로직, API 클라이언트, 생성 프롬프트, 저장 로직이 들어 있습니다.

- `gemini.ts`: Gemini 생성 호출, 프롬프트 구성, 응답 검증
- `guardrails.ts`: 생성 payload 검증, 근거 수집, 금지 표현 검사
- `rag.ts`: OpenAI Vector Store/RAG 업로드와 검색
- `openai.ts`: OpenAI 기반 생성 보조 경로
- `curriculum.ts`, `curriculum-server.ts`: 과목/성취기준 조회, 업로드 검증, 과목명 정규화와 자동 등록 저장 호출, subject_type 판정, 학습모듈 우선 관련도 기반 선택
- `draft-quality.ts`: 생성 결과 유사도 분석
- `record-drafts.ts`: `record_drafts` 저장, 수정, 최종 확정/해제
- `student-records.ts`: 학생별 학생부 조회
- `students.ts`: 학생 CRUD와 프로필 보조 로직
- `admin-settings.ts`: 관리자 설정 로딩과 fallback 구성
- `generate-api-client.ts`, `generate-api-auth.ts`: 생성 API 로그인 토큰 전달과 서버 측 학교/학생 소속 검증
- `export-results.ts`: 과세특/행특 엑셀 다운로드
- `student-template.ts`, `curriculum-template.ts`: 엑셀 템플릿 생성
- `supabase.ts`, `supabase-server.ts`: Supabase 클라이언트
- `types.ts`: 주요 타입 정의

### supabase/

데이터베이스 스키마와 migration 파일이 들어 있습니다.

- `schema.sql`: 기본 스키마
- `migrations/20260622_auth_students.sql`: 인증/학생 기반 구조
- `migrations/20260622_admin_settings.sql`: 관리자 설정
- `migrations/20260624_curriculum.sql`: 과목/성취기준 구조
- `migrations/20260625_unify_subject_master.sql`: 과목 마스터 통합
- `migrations/20260629_record_draft_quality_updates.sql`: 생성 품질 관리 보강
- `migrations/20260630_record_draft_lifecycle.sql`: 학생부 lifecycle 확장
- `migrations/20260702_curriculum_learning_module.sql`: 성취기준 학습모듈 컬럼과 중복 기준 확장
- `migrations/20260702_secure_record_drafts_rls.sql`: 학생부 개인 소유 RLS, 사용자 관리 RLS, 생성 API 우회 방지 보강
- `migrations/20260703_curriculum_upload_auto_subjects.sql`: 성취기준 업로드 upsert용 중복 방지 인덱스와 과목명 정규화 조회 인덱스
- `migrations/20260706_record_drafts_current_versions.sql`: `record_drafts` 현재본 컬럼, 기준별 current unique index, 기존 데이터 current backfill

## 4. 주요 화면

### 로그인

- 경로: `/login`
- Supabase Auth 기반 로그인/회원가입
- 사용자 이름과 학교 ID 저장

### 대시보드

- 경로: `/dashboard`
- 과세특, 행동특성, 학생 관리, 일괄 생성, 학생부 관리, 관리자 화면으로 이동하는 작업 허브

### 과세특

- 경로: `/subject-comment`
- 학생과 과목 정보를 선택하고 과세특 초안 생성
- 과목 선택은 `SubjectSelect`를 통해 전체 과목 목록을 계속 표시
- 일반교과는 학습모듈 선택 비활성화, NCS교과는 학습모듈 선택과 단원 자동완성 제공
- 선택한 학습모듈의 성취기준을 우선 사용하고, 없으면 기존 과목 기준 성취기준으로 fallback
- 학습모듈을 포함한 성취기준 RAG/관련도 선택 결과를 생성 프롬프트에 반영
- 생성 결과 편집, 저장, 비교, 최종 확정

### 행동특성

- 경로: `/behavior-comment`
- 학생과 학급 정보를 선택하고 행동특성 및 종합의견 초안 생성
- 담임 관찰 메모와 생활 영역/태도 입력 중심 생성
- 생성 결과 편집, 저장, 비교, 최종 확정

### 학생 관리

- 경로: `/students`
- 학생 CRUD
- 학생 엑셀 업로드
- 학생 템플릿 다운로드
- 학생 목록은 최초 진입 시 표시하지 않고, 학년과 학과를 선택하면 자동으로 표시
- 반은 멀티셀렉트 드롭다운으로 선택하며, 선택하지 않으면 학년/학과 전체 학생 표시
- 검색은 선택된 학년/학과/반 목록 안에서 학생 이름 기준으로 적용

### 학생부 관리

- 경로: `/student-records`
- 학생별 과세특/행특 현재본 조회
- 과세특은 과목별 현재본, 행특은 학생별 현재본 1개 기준으로 표시
- 학생 목록 필터는 현재 학년/학과/반 선택값과 후보 목록을 분리해 관리
- 학년과 학과 선택 전에는 학생 목록을 숨기고, 학생 선택 전에는 우측 상세를 표시하지 않음
- AI 원본, 수정본, 최종본 비교
- 생성 이력 timeline 확인
- 복사, 재생성, 최종 확정/해제

### 과목/성취기준

- 경로: `/admin/curriculum`
- 과목 관리
- 과목명 검색, 교과유형 필터, 조회 버튼을 통한 조회 기반 과목 목록 표시
- 과목 선택 시 같은 화면에서 성취기준을 학습모듈별 접기/펼치기 그룹으로 표시
- 학습모듈명 포함 성취기준 엑셀 업로드
- 핵심키워드 선택 입력과 NCS교과 학습모듈 권장 경고
- 업로드 미리보기에서 기존 과목 사용, 신규 과목 자동 등록 예정, 동일 과목 중복, 과목 교과유형 충돌 상태 표시
- 저장 시 엑셀 과목명을 기준으로 미등록 과목을 먼저 자동 등록하고 성취기준을 저장
- 학습모듈을 포함한 중복 검사와 업로드 결과 확인

### 관리자

- 경로: `/admin`
- 관리자 설정 진입
- 학과, 과목/성취기준, 체크리스트 관리

## 5. AI 생성 흐름

```text
학생 선택
↓
입력
↓
RAG
↓
생성
↓
중복도 검사
↓
교사 수정
↓
최종본
↓
엑셀
```

상세 흐름:

- 교사가 학생을 선택합니다.
- 과세특 또는 행동특성 입력값을 작성합니다.
- 과세특 과목 선택 options는 학교의 `curriculum_subjects` 전체 목록 또는 fallback 전체 목록을 사용하고, subject_type 판정과 학습모듈 조회는 선택된 value 기준으로 수행합니다.
- 과세특은 과목과 성취기준 후보를 조회하고 학습모듈, 단원명, 성취기준, 핵심키워드 순서의 관련도/랜덤 분산 로직으로 참고 성취기준을 선별합니다.
- NCS교과에서 학습모듈을 선택하면 해당 학습모듈 안에서 먼저 후보를 고르고, 후보가 없으면 기존 과목명 기준 조회로 보완합니다.
- RAG 문서와 성취기준, 교사 입력 근거를 생성 프롬프트에 반영합니다.
- Gemini API가 학생부 문체의 초안을 생성합니다.
- 일괄 생성에서는 같은 생성 묶음 안에서 중복도를 분석합니다.
- 교사가 AI 원본을 확인하고 수정본을 작성합니다.
- 최종본을 확정합니다.
- 최종본 선택 규칙에 따라 복사하거나 엑셀로 다운로드합니다.

## 6. Student Lifecycle

```text
AI 원본
↓
수정본
↓
최종본
```

### AI 원본

- 생성 API가 반환한 최초 결과입니다.
- `record_drafts.ai_content`에 저장합니다.
- 비교 기준으로 보존합니다.
- 같은 현재본 기준의 row가 이미 있으면 `record_drafts`를 새로 insert하지 않고 해당 row의 AI 원본과 lifecycle 값을 갱신합니다.
- 기존 현재본이 최종 확정 상태이면 자동 갱신하지 않습니다.

### 수정본

- 교사가 직접 수정한 내용입니다.
- `record_drafts.edited_content`에 저장합니다.
- 수정 후 3초 자동 저장 또는 명시적 저장으로 갱신합니다.

### 최종본

- 교사가 확정한 최종 제출용 내용입니다.
- `record_drafts.final_content`에 저장합니다.
- 복사와 엑셀 다운로드에서 가장 우선 사용합니다.
- 필요하면 최종 해제로 다시 수정 상태로 돌릴 수 있습니다.

### 현재본과 이력

- 과세특 현재본은 교사, 학교, 학생, `mode = subject`, 과목명, 학년도, 학기 조합으로 1개만 유지합니다.
- 행특 현재본은 교사, 학교, 학생, `mode = behavior`, 학년도, 학기 조합으로 1개만 유지하며 `subject_name`은 null로 둡니다.
- 기존 `record_drafts` 데이터는 삭제하지 않고 migration에서 기준별 최신 row만 `is_current = true`, 나머지는 `is_current = false`로 표시합니다.
- `version_no`는 기존 row를 기준별 생성 순서대로 backfill하며, 현재본 AI 재생성 갱신 시 증가합니다.

## 7. 보안 및 RLS 권한 구조

### 학교 공유 데이터

- `students`: 같은 학교 사용자만 조회, 추가, 수정, 삭제할 수 있습니다.
- `curriculum_subjects`, `curriculum_standards`: 같은 학교에서 공유하며, 수동 과목 관리는 관리자 중심으로 유지합니다. 성취기준 업로드 저장 API는 로그인한 teacher/admin의 학교 ID를 확인한 뒤 업로드 파일에 필요한 과목만 자동 등록합니다.
- `departments`, `checklist_categories`, `checklist_items`: 같은 학교에서 조회하고 관리자는 같은 학교 설정만 수정합니다.

### 교사 개인 데이터

- `record_drafts`의 AI 원본, 수정본, 최종본, 생성 이력은 `user_id = auth.uid()` 기준으로만 조회/수정합니다.
- 같은 학교 관리자라도 기본 RLS 정책으로 다른 교사의 `record_drafts`를 조회하지 않습니다.
- Bulk 생성과 Student Record Center도 `school_id + user_id` 필터로 현재 로그인 교사의 draft만 저장, 수정, 조회합니다.
- 현재본 unique index와 조회 조건은 RLS를 변경하지 않으며, 기존 `user_id = auth.uid()` 소유자 정책을 유지합니다.

### 관리자 권한

- 관리자는 같은 학교의 사용자 프로필을 조회하고 role을 수정할 수 있습니다.
- 관리자는 학교 설정, 과목, 성취기준, 체크리스트를 같은 학교 범위에서 관리합니다.
- 관리자 권한은 학생부 원문 조회 권한으로 확장되지 않습니다.

### 학교 경계

- 사용자의 `public.users.school_id`와 행의 `school_id`가 다르면 학생, 과목, 성취기준, 학교 설정, 학생부 draft에 접근할 수 없습니다.
- 과세특 생성 API는 클라이언트가 보낸 `schoolId`를 신뢰하지 않고, 로그인 토큰으로 조회한 서버 측 학교 ID만 사용합니다.
- 선택 학생 ID가 현재 학교 학생이 아니면 생성 API 요청을 거부합니다.

## 8. 현재 기술 스택

- Next.js 15 App Router
- React 19
- TypeScript
- TailwindCSS
- Supabase Auth
- Supabase Database
- OpenAI Vector Store/RAG
- Gemini API
- xlsx
- Vercel

기본 실행:

```bash
npm install
npm run dev -- --port 3002
```

검증 명령:

```bash
npm run typecheck
npm run build
```

주요 환경변수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_DEFAULT_SCHOOL_ID=demo-school

SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=knowledge-files
DEFAULT_SCHOOL_ID=demo-school

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_VECTOR_STORE_ID=
```

배포 정보:

```text
Production URL: https://meister-record-ai.vercel.app
GitHub: https://github.com/quiet210/meister-record-ai
```

## 9. 최근 반영 사항

- 과목/성취기준 관리 화면을 조회 기반 UI로 개선
- 선택 과목 기준 성취기준 조회와 학습모듈별 그룹 표시 적용
- 학생 조회 UX를 학년 -> 학과 -> 반 구조로 통일하고, 반 선택을 멀티셀렉트 드롭다운으로 변경
- 공통 `StudentFilter`를 추가해 조회 전 학생 목록과 입력 테이블이 표시되지 않도록 개선
- 일괄 과세특, 일괄 행특, 학생부 관리 화면 성능 최적화 작업 완료
- `lib/generate-api-client.ts` 누락으로 발생하던 빌드 오류 해결
- `record_drafts` RLS를 현재 로그인 교사 `user_id` 기준으로 강화
- 교사별 학생부 draft 분리 완료
- NCS교과 학습모듈 선택, 과목 변경 시 학습모듈 초기화, 새 과목 기준 학습모듈 목록 재조회 완료
- 과목 선택 `datalist` 후보가 현재 선택 과목 1개로 좁아 보이던 버그 수정 완료
- 성취기준 업로드 시 과목 자동 등록, 엑셀 내 동일 과목 중복 등록 방지, 과목명 교과유형 충돌 검증 추가

## 10. 향후 계획

현재 우선순위는 다음 순서입니다.

1. 불필요한 버튼 정리
   - 생성, 재생성, 저장, 확정 흐름에서 중복되거나 의미가 겹치는 버튼을 정리합니다.
   - 단일 생성과 일괄 생성의 조작 모델을 더 일관되게 맞춥니다.

2. 성능 최적화
   - 일괄 생성 상태 업데이트와 저장 호출을 최적화합니다.
   - 학생 수가 많은 학급에서도 테이블 렌더링과 유사도 분석이 안정적으로 동작하도록 개선합니다.

3. 담임 Dashboard
   - 담임교사가 맡은 반의 행특 작성 현황, 미작성 학생, 최종 확정 여부를 한눈에 볼 수 있는 화면을 추가합니다.
   - 학생별 진행률과 빠른 이동 기능을 제공합니다.

4. RAG 고도화
   - OpenAI Vector Store 검색 품질을 개선합니다.
   - 과목/학년/학과/문서 유형 필터와 학습모듈 기반 성취기준 관련도 계산을 더 긴밀하게 통합합니다.
   - 생성 근거 표시를 더 투명하게 개선합니다.
