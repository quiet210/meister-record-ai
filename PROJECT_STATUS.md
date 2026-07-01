# Project Status

최종 업데이트: 2026-06-30

## 현재 상태 요약

공업계 마이스터고 학생부 작성 지원 플랫폼은 Next.js 15 App Router, TypeScript, TailwindCSS, Supabase Auth/DB, Gemini API, Vercel 기반으로 동작한다.

현재 앱은 회원가입/로그인, 학생 관리, 학생 엑셀 업로드, 학생 엑셀 양식 다운로드, 과세특 생성, 과세특 일괄 생성, 행동특성 및 종합의견 생성, 행동특성 및 종합의견 일괄 생성, 관리자 설정, 과목/성취기준 관리, 과세특 생성 시 성취기준 프롬프트 반영과 학생별 분산 선택, 일괄 생성 결과 품질 관리, 결과 편집, 최종본 확정, 결과 엑셀 다운로드 기능까지 구현되어 있다. 관리자 설정값은 Supabase DB를 우선 사용하고, DB 데이터가 없거나 로딩 전이면 기존 `lib/options.ts` 상수를 fallback으로 사용한다. 데스크톱 레이아웃은 `AppShell` 중심의 넓은 앱 컨테이너와 `min-w-0`/내부 테이블 스크롤 구조로 정리되어 페이지 전체 가로 스크롤이 발생하지 않도록 조정했다. 행동특성 일괄 생성 payload는 화면 state와 API payload의 매핑을 점검해 `schoolLifeAreas`와 `industrialAttitudes`를 분리 전달하도록 수정했다.

## 현재 프로젝트 진행률

현재 진행률은 약 96%이다.

- 핵심 작성 흐름: 과세특/행동특성 단일 생성과 일괄 생성 완료
- 데이터 관리: 학생 CRUD, 엑셀 업로드/양식 다운로드, 관리자 설정, 과목/성취기준, 체크리스트 관리 완료
- 저장 흐름: 생성 결과 `record_drafts` insert 저장, 교사 수정본 저장, 최종본 확정 완료
- 품질 관리: 생성 결과 유사도 분석, 70~84% 유사 표시, 85% 이상 중복 의심 표시, 선택 학생 재생성 완료
- 내보내기: 과세특/행특 일괄 생성 결과 엑셀 다운로드 완료, 최종본 선택 규칙 적용 완료
- 레이아웃 안정화: 앱 전체 가로 스크롤 제거, 일괄 입력 테이블 내부 스크롤 구조 적용 완료
- 남은 주요 작업: 생성 이력 관리, RAG 고도화

## 현재 완료 기능

- GitHub 연동 완료
- Vercel 배포 완료
- Supabase Auth 완료
- 학생 CRUD 완료
- 학생 엑셀 업로드 완료
- 학생 엑셀 양식 다운로드 기능 추가
- `public.students` 저장 성공 확인
- 관리자 권한 기능 완료
- 관리자 페이지 완료
- 학과 관리 완료
- 과목/성취기준 관리 완료
- 체크리스트 관리 완료
- 과목/성취기준 관리 페이지 추가
- 성취기준 업로드 기능 완료
- 성취기준 엑셀 양식 다운로드 기능 추가
- `curriculum_subjects` 테이블 추가
- `curriculum_standards` 테이블 추가
- 정확 중복 검사 완료
- 유사 중복 검사 완료
- teacher 성취기준 업로드 지원 완료
- admin 과목 관리 기능 완료
- 과목 관리 `curriculum_subjects` 중심 통합 완료
- 과세특 생성 시 업로드된 성취기준 Gemini 프롬프트 반영 완료
- 과세특 생성 시 성취기준 관련도 기반 + seed 랜덤 분산 선택 완료
- `/bulk-subject-comment` 과세특 일괄 생성 화면 추가 완료
- 과세특 일괄 생성 학생별 입력/상태/결과/복사/실패 재시도 구현 완료
- 과세특 일괄 생성 동시 API 호출 수 3개 제한 및 `record_drafts` 자동 저장 완료
- `/bulk-subject-comment` 레이아웃을 학생별 입력 테이블 중심 구조로 개선 완료
- `/bulk-behavior-comment` 행동특성 및 종합의견 일괄 생성 화면 추가 완료
- 행동특성 일괄 생성 학생별 입력/상태/결과/복사/실패 재시도 구현 완료
- 행동특성 일괄 생성 동시 API 호출 수 3개 제한 및 `record_drafts.mode = behavior` 자동 저장 완료
- 행동특성 일괄 생성 payload 매핑 버그 수정 완료: 학교생활 영역은 `schoolLifeAreas`, 생활태도 키워드/협업·관계/책임감·성실성은 `industrialAttitudes`로 전달
- 과세특/행동특성 일괄 생성 결과 중복도 자동 분석 완료
- 생성 결과 영역에 학생명, 유사도, 복사, 재생성, 상태 표시 완료
- 유사도 기준별 정상/유사/중복 의심 표시 완료
- 중복 의심 학생만 체크박스로 선택해 기존 생성 API를 재호출하는 선택 재생성 완료
- 재생성 시 `record_drafts` 최신 row 업데이트 저장 경로 완료
- 과세특 일괄 생성 결과 엑셀 다운로드 완료
- 행특 일괄 생성 결과 엑셀 다운로드 완료
- 과세특/행동특성 단일 생성 결과 편집기 완료
- 과세특/행동특성 일괄 생성 결과 학생별 편집기 완료
- 학생부 lifecycle 완료: AI 원본, 교사 수정본, 최종본
- AI 원본 비교, AI 다시 생성 후보 선택, 최종 확정/해제 완료
- 교사 수정본 3초 자동 저장과 명시적 저장 완료
- 복사와 엑셀 다운로드 최종본 선택 규칙 적용 완료
- 데스크톱 레이아웃 가로 스크롤 문제 개선 완료
- `AppShell`, `Dashboard`, `RecordComposer`, `DesktopRecordComposer`, `BulkSubjectCommentComposer`, `BulkBehaviorCommentComposer`, `StudentManager`, `CurriculumManager` 공통 레이아웃 폭/스크롤 구조 점검 완료
- 학생별 입력 테이블은 필요한 경우 내부 컨테이너에서만 가로 스크롤되도록 조정 완료
- `/dashboard`, `/bulk-subject-comment`, `/bulk-behavior-comment` Tailwind 스타일 및 페이지 overflow 정상 확인 완료
- Vercel TypeScript 빌드 오류 대응 완료
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
  - `/admin/subjects`는 deprecated 경로로 `/admin/curriculum` 리다이렉트
  - `/admin/checklists`
- 과목/성취기준 화면 구현:
  - `/admin/curriculum`
  - teacher도 성취기준 업로드 가능

### 학생 관리

- 학생 목록 조회
- 학생 추가
- 학생 수정
- 학생 삭제
- 학생 추가/수정 후 Supabase 기준 목록 재조회
- 학생 삭제 후 화면 목록 갱신
- 학생 엑셀 업로드
- 학생 엑셀 양식 다운로드
- `school_id` 기준 데이터 분리
- `public.students` 실제 저장 성공 확인

### 생성 기능

- 과세특 생성 화면 구현
- 과세특 일괄 생성 화면 구현
- 행동특성 및 종합의견 생성 화면 구현
- 행동특성 및 종합의견 일괄 생성 화면 구현
- Gemini API 기반 서버 Route 연결
- 과세특 생성 시 선택 과목 기준 `curriculum_standards` active 성취기준 전체 후보 조회 및 Gemini 프롬프트 반영
- 과세특 생성 시 단원명, 교사 관찰 메모, 활동 유형, 역량 키워드, 보완점, 과목명 기반 관련도 점수 계산
- 관련도 높은 후보군 안에서 `selectedStudentId`, `student_no`, 학생 이름, 현재 날짜 기반 seed 랜덤 선택으로 최대 3개 성취기준 주입
- 생성 결과 복사 기능
- 생성 결과 Supabase `record_drafts` 저장 기능
- 단일 생성 결과 편집기 구현
  - AI 생성 직후 `ai_content`와 `edited_content`를 초기 저장
  - 교사 수정본은 textarea에서 직접 수정
  - 수정 후 3초 자동 저장 또는 저장 버튼으로 `edited_content` 갱신
  - `AI 원본 보기`로 AI 원본과 현재 수정본을 좌우 비교
  - `AI 다시 생성` 결과는 기존 수정본을 덮어쓰지 않고 `현재 유지` 또는 `새 결과 사용` 선택 후 반영
  - `최종 확정`은 `final_content`를 저장하고, `최종 해제`로 수정 가능 상태로 되돌림
- 과세특 일괄 생성:
  - `/bulk-subject-comment` 라우트 추가
  - 학년/반/학과 필터, 필터 결과 전체 선택, 학생별 입력 테이블 내 개별 선택 구현
  - 과목명, 단원명, 분량, 문체를 공통 입력값으로 관리
  - 공통 설정을 최상단에 배치하고, 학생별 입력 테이블을 화면 핵심 영역으로 구성
  - 학생별 입력 테이블은 페이지 전체가 아니라 테이블 컨테이너 내부에서만 가로 스크롤되도록 구성
  - 학생별 입력 테이블 컬럼은 선택 체크박스, 학생명, 활동유형, 역량키워드, 보완점, 교사 관찰 메모, 상태, 작업으로 구성
  - 활동유형, 역량 키워드, 보완점 칩 선택과 교사 관찰 메모 입력을 각 학생 행 안에서 직접 수행
  - 활동유형, 역량 키워드, 보완점은 `loadSettingsOptions()`의 관리자 체크리스트 설정값을 사용하고 DB 값이 없으면 기존 옵션으로 fallback
  - 학생별 입력 테이블 상단에 선택 학생 생성, 실패만 재생성, 선택 학생에게 값 일괄 적용, 이전 학생 값 복사 버튼 배치
  - 선택 학생 일괄 적용 UI는 기본 화면 핵심 영역에서 제거하고 접을 수 있는 보조 기능으로 축소
  - 이전 학생 값 복사, 선택 학생에게 일괄 적용, 빈 값 경고 구현
  - 학생별 payload에 `selectedStudentId`, `studentNo`, 학생 이름, 학년, 학과, 개별 입력값을 포함해 기존 `/api/generate/subject-comment` API 재사용
  - 브라우저 측 worker 방식으로 동시 생성 수를 3개로 제한
  - 학생별 상태를 대기, 생성 중, 완료, 실패로 표시
  - 생성 결과는 입력 테이블 컬럼에 넣지 않고 테이블 아래 별도 생성 결과 영역에 학생별 표시
  - 생성 결과 복사, 교사 수정본 저장, AI 원본 비교, AI 다시 생성, 최종 확정/해제 가능
  - 생성 결과 영역 상단 오른쪽에서 `subject-comments-results.xlsx` 파일로 결과 엑셀 다운로드 가능
  - 생성 성공 시 `saveRecordDraft()`로 `record_drafts`에 자동 저장
  - 교사 수정본은 3초 자동 저장 또는 저장 버튼으로 `edited_content`에 저장
  - AI 다시 생성 결과는 기존 수정본을 덮지 않고 후보로 표시한 뒤 선택 시 저장
  - 실패한 학생만 다시 생성 가능
- 행동특성 일괄 생성:
  - `/bulk-behavior-comment` 라우트 추가
  - 학년/반/학과 필터, 분량, 문체, 작성 관점을 공통 설정으로 관리
  - 과목명, 단원명, 성취기준은 사용하지 않음
  - 공통 설정 아래에 학생별 입력 테이블을 핵심 영역으로 구성
  - 학생별 입력 테이블 컬럼은 선택, 학생명, 학교생활 영역, 생활태도 키워드, 협업/관계, 책임감/성실성, 보완점, 담임 관찰 메모, 상태, 작업으로 구성
  - 각 학생 행 안에서 키워드 선택과 담임 관찰 메모 입력을 직접 수행
  - 학생별 payload에 학생 이름, 학년, 반, 학과, 학교생활 영역, 공업계 특화 생활태도, 보완점, 담임 메모, 분량, 문체, 작성 관점을 포함해 기존 `/api/generate/behavior-comment` API 재사용
  - payload 매핑은 `schoolLifeAreas`에 학교생활 영역만 넣고, 생활태도 키워드/협업·관계/책임감·성실성 선택값은 `industrialAttitudes`로 합쳐 전달
  - 기존에는 UI 키워드 state가 `schoolLifeAreas`에 합쳐지고 `industrialAttitudes`가 빈 배열로 전달되어 서버 검증에서 공업계 특화 생활태도가 비어 있다고 판단할 수 있었으며, 이 매핑 오류를 수정 완료
  - 브라우저 측 worker 방식으로 동시 생성 수를 3개로 제한
  - 학생별 상태를 대기, 생성 중, 완료, 실패로 표시
  - 생성 결과는 입력 테이블 아래 별도 영역에 학생별 표시
  - 생성 결과 복사, 교사 수정본 저장, AI 원본 비교, AI 다시 생성, 최종 확정/해제 가능
  - 생성 결과 영역 상단 오른쪽에서 `behavior-comments-results.xlsx` 파일로 결과 엑셀 다운로드 가능
  - 생성 성공 시 `saveRecordDraft()`로 `record_drafts`에 `mode=behavior` 저장
  - 교사 수정본은 3초 자동 저장 또는 저장 버튼으로 `edited_content`에 저장
  - AI 다시 생성 결과는 기존 수정본을 덮지 않고 후보로 표시한 뒤 선택 시 저장
  - 실패한 학생만 다시 생성 가능
- 생성 품질 관리:
  - 과세특/행동특성 일괄 생성 완료 후 이번 생성에서 성공한 학생 초안만 비교
  - 학생 이름을 제거한 초안 텍스트를 단어 토큰과 문자 2~3gram 벡터로 변환한 뒤 cosine similarity 계산
  - 각 학생은 같은 생성 묶음 안에서 가장 유사한 다른 학생과의 최고 유사도를 표시
  - 85% 이상은 빨간색 `중복 의심`, 70~84%는 노란색 `유사`, 70% 미만은 `정상`
  - 결과 영역은 학생명, 유사도, 복사, 저장, AI 원본 비교, AI 다시 생성, 최종 확정, 상태를 함께 표시
  - `중복 의심` 학생만 체크박스로 선택 가능하며, `선택 학생 재생성`으로 기존 과세특/행동특성 생성 API를 다시 호출해 새 AI 후보를 표시
  - 과세특 재생성은 기존 성취기준 조회, 관련도 기반 선택, 학생 seed 기반 분산 로직을 변경하지 않고 같은 payload로 재호출
  - 새 AI 후보는 `현재 유지` 또는 `새 결과 사용` 선택 전에는 `edited_content`와 `final_content`를 덮어쓰지 않는다.
  - 결과 엑셀 다운로드는 `final_content`, `edited_content`, `ai_content` 순서의 최종 출력 내용을 사용하며, 실패 항목은 생성 결과를 빈칸으로 두고 생성 상태를 `실패`로 표시한다.

### 레이아웃과 스타일 안정화

- 공통 `AppShell`을 `max-w-[1760px]`, `w-full`, `grid-cols-[220px_minmax(0,1fr)]`, `main min-w-0` 중심 구조로 정리했다.
- `html`, `body`, 최상위 앱 래퍼에는 페이지 전체 가로 overflow를 막는 `overflow-x-hidden`을 적용했다.
- `Dashboard`, `StudentManager`, `KnowledgeUpload`, `CurriculumManager`, `DesktopRecordComposer` 등 주요 화면 루트와 grid 자식에 `min-w-0`을 보강했다.
- `DesktopRecordComposer`는 결과 패널을 고정 430px 대신 `minmax(320px,400px)`/`2xl:420px` 구조로 조정해 데스크톱 폭을 더 자연스럽게 사용한다.
- `/bulk-subject-comment` 학생별 입력 테이블은 `w-full min-w-[1180px]`와 내부 `overflow-x-auto` 컨테이너를 사용한다.
- `/bulk-behavior-comment` 학생별 입력 테이블은 컬럼 수가 많으므로 `w-full min-w-[1440px]`와 내부 `overflow-x-auto` 컨테이너를 사용한다.
- `StudentManager`와 `CurriculumManager`는 반응형 grid와 `min-w-0` 보강으로 좁은 화면에서 전체 페이지 폭을 밀지 않도록 조정했다.
- 페이지 전체 가로 스크롤은 제거하고, 넓은 데이터 입력/관리 테이블은 각 테이블 컨테이너 내부에서만 스크롤되도록 변경했다.
- 1440px 기준 `/dashboard`, `/bulk-subject-comment`, `/bulk-behavior-comment`에서 페이지 전체 가로 overflow가 없고 Tailwind 패널/버튼 스타일이 정상 적용됨을 확인했다.
- `npm run build`를 실행하는 동안 기존 `next dev` 서버가 같은 `.next` 산출물을 사용 중이면 개발 서버의 CSS/청크가 깨질 수 있다. 빌드 검증 후 개발 화면이 기본 HTML처럼 보이면 dev 서버를 종료하고 다시 실행한다.

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

### 과목/성취기준 관리

- `/admin/curriculum` 페이지 구현
- 과목 생성/수정/삭제 구현
  - `admin`만 가능
  - 필드: `subject_name`, `subject_type`, `description`, `sort_order`
- 성취기준 엑셀 업로드 구현
  - `admin`, `teacher` 모두 가능
  - 지원 파일: `.xlsx`, `.xls`, `.csv`
  - 업로드 컬럼: `과목명`, `교과유형`, `단원명`, `성취기준`, `핵심키워드`
  - 교과유형 허용값: `일반교과`, `NCS교과`, `general`, `ncs`
- 업로드 전 미리보기 구현
  - `정상`
  - `오류`
  - `정확 중복`
  - `유사 중복 의심`
  - `과목 없음`
- 업로드 옵션 구현
  - 신규만 저장
  - 유사 중복 포함 저장
  - 정확 중복은 항상 제외
- 업로드 결과 표시 구현
  - 총 행 수
  - 신규 저장 수
  - 정확 중복 제외 수
  - 유사 중복 제외 수
  - 오류 수
  - 과목 없음 수
- 성취기준 엑셀 양식 다운로드 구현
  - 파일명: `curriculum-standards-template.xlsx`
  - 시트명: `성취기준업로드양식`
- 성취기준 검색 함수 뼈대 추가
  - `lib/curriculum.ts`의 `getCurriculumStandardsBySubject(subjectName)`
- 과세특 생성 프롬프트 연결 완료
  - 선택 과목명과 `school_id`, `status = active` 조건으로 성취기준 전체 후보 조회
  - `unit_name`, `keywords`, `achievement_standard`와 학생 입력값을 비교해 관련도 점수 계산
  - 관련도 높은 후보군 안에서 seed 기반 랜덤성을 적용해 최대 3개를 Gemini 프롬프트에 참고 자료로 주입
  - 후보가 3개 이하이면 전부 사용
  - 성취기준이 없거나 조회를 건너뛰어도 기존 과세특 생성 로직으로 계속 동작
  - `getCurriculumStandardsBySubject(subjectName, { schoolId, limit })`는 선택적 `limit` 옵션을 지원해 이전 호출 방식과도 타입 호환

중요: 성취기준 업로드 기능, 생성 AI 프롬프트 반영, 학생별 분산 선택은 완료됐다. 다음 단계에서는 현재 관련도 계산을 벡터 검색/RAG와 통합해 검색 품질을 높일 수 있다.

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
- `GetCurriculumStandardsBySubjectOptions`는 `schoolId`와 선택적 `limit`을 허용하며, 기본 과세특 생성 경로는 전체 후보 조회 후 관련도/분산 선택을 수행
- 과세특 작성 화면의 과목 선택 목록은 `curriculum_subjects`를 우선 사용하고, 테이블이 없거나 로딩 실패/빈 결과이면 `lib/options.ts` 상수를 fallback으로 사용
- 성취기준 업로드는 `curriculum_subjects.school_id + subject_name`을 기준으로 과목을 매칭
- 과세특 생성 시 선택 과목 기준으로 active 성취기준 전체 후보를 조회하고 관련도 기반 + seed 랜덤 분산 선택으로 최대 3개를 Gemini 프롬프트에 반영 완료
- 과세특 일괄 생성도 기존 과세특 생성 API를 학생별로 호출하므로 동일한 성취기준 조회/관련도/seed 분산 선택 흐름을 그대로 사용
- 행동특성 일괄 생성은 기존 행동특성 생성 API를 학생별로 호출하고, 과목명/단원명/성취기준 없이 생활 관찰 입력만 사용
- 과세특/행동특성 일괄 생성 후 생성 성공 초안만 대상으로 같은 생성 묶음 내부 유사도를 분석
- 중복 의심 학생 선택 재생성은 기존 생성 API를 재호출하고 `record_drafts` 최신 row를 업데이트
- 성취기준 후보가 3개 이하이면 전부 사용하고, 후보가 없으면 기존 생성 흐름 유지

## 현재 사용 중인 주요 테이블

- `public.users`
- `public.students`
- `public.record_drafts`
- `public.departments`
- `public.subjects` deprecated
- `public.curriculum_subjects`
- `public.curriculum_standards`
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

생성된 과세특/행동특성의 AI 원본, 교사 수정본, 최종본과 입력 payload를 저장한다.

- `mode`: `subject` 또는 `behavior`
- `input_payload`
- `result_payload`
- `draft_text`: 이전 코드와의 호환을 위한 현재 출력 텍스트
- `ai_content`: AI가 처음 생성한 원본이며 직접 수정하지 않는다.
- `edited_content`: 교사가 편집하고 저장한 수정본
- `final_content`: 교사가 최종 확정한 출력본
- `status`: `ai_generated`, `editing`, `saved`, `finalized`
- `edited_at`, `finalized_at`, `edited_by`
- `updated_at`: 최신 row가 수정된 시각
- 복사와 엑셀 다운로드는 `final_content`, `edited_content`, `ai_content` 순서로 출력 내용을 선택한다.

### departments

관리자가 수정할 수 있는 학교별 학과 설정이다.

- `school_id`
- `code`
- `label`
- `sort_order`

### subjects

Deprecated된 기존 학교별 과목 설정 테이블이다. 즉시 삭제하지 않고 데이터 보존과 이전 호환용으로만 유지한다.

- `school_id`
- `name`
- `sort_order`

### curriculum_subjects

단일 과목 마스터 테이블이다. 과세특 과목 선택, 성취기준 업로드 매칭, 성취기준 검색의 과목 기준으로 사용한다.

- `school_id`
- `subject_name`
- `subject_type`: `general` 또는 `ncs`
- `description`
- `sort_order`

### curriculum_standards

과목별 성취기준, 단원명, 핵심키워드와 업로드/중복 상태를 저장한다.

- `school_id`
- `subject_id`
- `subject_name`
- `subject_type`
- `unit_name`
- `achievement_standard`
- `keywords`
- `uploaded_by`
- `status`: `active`, `pending`, `rejected`
- `duplicate_status`
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
supabase/migrations/20260624_curriculum.sql
supabase/migrations/20260625_unify_subject_master.sql
supabase/migrations/20260629_record_draft_quality_updates.sql
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

`20260624_curriculum.sql`:

- `curriculum_subjects`
- `curriculum_standards`
- `curriculum_subjects` RLS 정책
  - 같은 `school_id` 사용자는 조회 가능
  - `admin`만 추가/수정/삭제 가능
- `curriculum_standards` RLS 정책
  - 같은 `school_id` 사용자는 조회 가능
  - `admin`, `teacher` 모두 추가 가능
  - `admin`은 수정/삭제 가능
  - `teacher`는 자신이 `uploaded_by`인 항목만 수정/삭제 가능
- 정확 중복 방지를 위한 unique constraint
  - `(school_id, subject_name, unit_name, achievement_standard)`

`20260625_unify_subject_master.sql`:

- `subjects` 테이블에 deprecated comment 추가
- `curriculum_subjects`를 단일 과목 마스터로 명시
- 기존 `subjects` 데이터를 `school_id + subject_name` 기준으로 `curriculum_subjects`에 이전
- 기존 `curriculum_subjects`에 같은 `school_id + subject_name` 과목이 있으면 기존 데이터를 유지

`20260629_record_draft_quality_updates.sql`:

- `record_drafts.updated_at` 컬럼 추가
- `record_drafts` update 시각 자동 갱신 트리거 추가
- 같은 교사/학생/mode 최신 초안 조회용 인덱스 추가
- 품질 재생성 저장을 위한 본인 소유 `record_drafts` update RLS 정책 추가

`20260630_record_draft_lifecycle.sql`:

- `record_drafts.ai_content`, `edited_content`, `final_content` 컬럼 추가
- `record_drafts.status`, `edited_at`, `finalized_at`, `edited_by` 컬럼 추가
- 기존 `draft_text`를 `ai_content`와 `edited_content`로 backfill
- lifecycle 상태 check constraint와 조회 인덱스 추가

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
- `xlsx` 의존성 누락 오류
  - 학생 엑셀 업로드와 양식 다운로드를 위해 `xlsx` 패키지를 추가했다.
  - 엑셀 파서와 템플릿 생성 로직은 사용자 동작 시 동적 import로 로드해 `/students` 초기 번들 부담을 줄였다.
- 과목/성취기준 관리 기능 추가
  - `/admin/curriculum` 라우트를 추가했다.
  - 관리자 홈과 공통 내비게이션, 대시보드에서 접근할 수 있게 했다.
  - teacher도 성취기준 업로드는 가능하지만 과목 생성/수정/삭제는 숨기고 DB/RLS에서도 제한한다.
  - 정확 중복은 저장하지 않고, 유사 중복은 미리보기에서 의심 상태로 표시한 뒤 선택적으로 저장한다.
- 과목 관리 구조 통합
  - 과목 마스터를 `curriculum_subjects` 중심으로 통합했다.
  - `subjects` 테이블은 deprecated 처리하고 즉시 삭제하지 않는다.
  - 과세특 과목 선택 목록, 성취기준 업로드 과목 매칭, 성취기준 검색은 모두 `curriculum_subjects`/`curriculum_standards` 기준으로 동작한다.
  - `/admin/subjects`는 별도 과목 관리 화면으로 사용하지 않고 `/admin/curriculum`으로 리다이렉트한다.
- 과세특 성취기준 선택 개선
  - 선택 과목 기준 active `curriculum_standards` 전체 후보를 조회한다.
  - 단원명, 교사 관찰 메모, 활동 유형, 역량 키워드, 보완점, 과목명을 입력 신호로 사용한다.
  - `unit_name`, `keywords`, `achievement_standard`를 입력값과 비교해 관련도 점수를 계산한다.
  - 관련도 높은 후보군에서 seed 기반 랜덤 추출로 학생별 성취기준이 조금씩 분산되도록 했다.
  - Gemini 프롬프트에 넣는 성취기준은 최대 3개로 제한한다.
  - 서버 로그에는 선택 과목, 전체 후보 수, 최종 선택 성취기준, 사용 seed를 출력한다.
- Vercel TypeScript 빌드 오류 대응
  - `app/api/generate/subject-comment/route.ts`에서 더 이상 중복 `limit` 전달을 사용하지 않는 현재 흐름을 확인했다.
  - Vercel 빌드에서 과거 호출 형태가 섞여도 깨지지 않도록 `lib/curriculum-server.ts`의 `GetCurriculumStandardsBySubjectOptions`에 선택적 `limit`을 추가했다.
  - `limit`이 유효한 양수일 때만 Supabase 쿼리에 `.limit()`을 적용한다.
  - 로컬 기준 `npm run typecheck`와 `npm run build` 통과를 확인했다.
- 데스크톱 가로 스크롤 및 Tailwind 스타일 깨짐 대응
  - 원인은 `AppShell`의 기존 `1fr` 메인 컬럼과 일괄 입력 테이블의 넓은 `min-w-*` 조합이 페이지 전체 폭을 밀 수 있는 구조였다.
  - `AppShell`을 `minmax(0,1fr)` 기반으로 바꾸고, 주요 콘텐츠 루트에 `min-w-0`을 적용했다.
  - 일괄 입력 테이블은 페이지 전체가 아니라 테이블 컨테이너 내부에서만 가로 스크롤되도록 조정했다.
  - Tailwind 전역 import는 `app/globals.css`에서 정상 유지됨을 확인했다.
  - 개발 화면이 기본 HTML처럼 보인 현상은 코드 문제가 아니라 `npm run build`와 실행 중인 `next dev`가 `.next` 산출물을 동시에 사용하며 생긴 dev 서버 상태 꼬임으로 확인했다.
  - dev 서버 재시작 후 `/dashboard`, `/bulk-subject-comment`, `/bulk-behavior-comment`에서 패널/카드/버튼 스타일 정상 적용과 페이지 전체 가로 overflow 없음 확인을 완료했다.
- AI 생성 결과 품질 관리 추가
  - 기존 과세특/행동특성 생성 API는 수정하지 않고, 일괄 생성 화면의 성공 결과 후처리로 유사도를 분석한다.
  - 이번 생성 묶음에서 성공한 초안만 비교해 기존 저장 데이터나 다른 학생 CRUD 흐름에 영향을 주지 않는다.
  - 중복 의심 학생 선택 재생성은 같은 API를 다시 호출하고, 저장 단계에서만 `record_drafts` 최신 row를 갱신한다.
- 행동특성 일괄 생성 payload 매핑 오류 수정
  - 화면의 학교생활 영역, 생활태도 키워드, 협업/관계, 책임감/성실성, 보완점, 담임 관찰 메모 state를 점검했다.
  - `schoolLifeAreas`에는 학교생활 영역만 전달하고, 생활태도 키워드/협업·관계/책임감·성실성은 `industrialAttitudes`로 합쳐 전달하도록 수정했다.
  - 기존 API는 수정하지 않고 클라이언트 payload 생성 로직만 수정했다.
  - 개발 환경에서 UI state, API payload, API result 흐름을 console로 확인할 수 있게 했다.
- 과세특/행특 일괄 생성 결과 엑셀 다운로드 추가
  - 기존 생성 API, 학생 CRUD, 관리자 기능, 성취기준 선택 로직은 수정하지 않고 결과 화면에 다운로드 버튼만 추가했다.
  - 과세특 다운로드 파일명은 `subject-comments-results.xlsx`, 시트명은 `과세특결과`이다.
  - 행특 다운로드 파일명은 `behavior-comments-results.xlsx`, 시트명은 `행특결과`이다.
  - 줄바꿈은 셀 안에 유지하고, 유사도는 `82%` 형식으로 저장한다.

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
- `components/BulkSubjectCommentComposer.tsx`
- `components/BulkBehaviorCommentComposer.tsx`
- `app/subject-comment/page.tsx`
- `app/bulk-subject-comment/page.tsx`
- `app/behavior-comment/page.tsx`
- `app/bulk-behavior-comment/page.tsx`

관리자 기능:

- `lib/admin-settings.ts`
- `lib/curriculum.ts`
- `lib/curriculum-template.ts`
- `components/AdminGuard.tsx`
- `components/AdminHome.tsx`
- `components/AdminDepartmentManager.tsx`
- `components/AdminSubjectManager.tsx`
- `components/CurriculumManager.tsx`
- `components/AdminChecklistManager.tsx`
- `app/admin/page.tsx`
- `app/admin/departments/page.tsx`
- `app/admin/subjects/page.tsx`
- `app/admin/curriculum/page.tsx`
- `app/admin/checklists/page.tsx`

생성 API:

- `app/api/generate/subject-comment/route.ts`
- `app/api/generate/behavior-comment/route.ts`
- `lib/curriculum-server.ts`
- `lib/gemini.ts`
- `lib/types.ts`
- `lib/draft-quality.ts`
- `lib/export-results.ts`
- `lib/record-drafts.ts`

## 실행 및 검증 명령

```bash
npm run typecheck
npm run build
npm run dev -- --port 3002
```

주의:

- `npm run build`는 검증용으로 실행하고, 이후 개발 서버 화면을 계속 확인해야 하면 기존 `next dev` 서버를 재시작한다.
- 실행 중인 dev 서버와 build가 같은 `.next` 디렉터리를 공유하면 개발 화면의 CSS/청크가 일시적으로 깨질 수 있다.

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

1. 생성 이력 관리
2. RAG 고도화: 학습목표, NCS, 루브릭, 교과서 활용

### 다음 단계 설계 방향

다음 1순위는 생성 이력 조회와 관리 기능이다. 이후 업로드 자료와 성취기준을 활용하는 RAG 고도화로 확장한다.

```text
과목 선택
↓
active curriculum_standards 전체 후보 조회
↓
관련도 기반 후보군 구성
↓
학생별 seed 랜덤 분산 선택
↓
Gemini 프롬프트 주입
↓
과세특 생성
```

- 현재 과세특 작성 화면의 `subjectName` 값은 `curriculum_subjects`에서 가져온 과목명이다.
- 생성 API는 선택 과목명과 `school_id`를 기준으로 `curriculum_standards.status = active` 성취기준 전체 후보를 조회한다.
- 검색된 단원명, 성취기준, 핵심키워드는 관련도 기반 + seed 랜덤 분산 선택 후 최대 3개까지 Gemini 프롬프트 컨텍스트로 주입한다.
- `getCurriculumStandardsBySubject()`는 선택적 `limit` 옵션을 지원하지만, 현재 과세특 생성 기본 경로는 전체 후보를 가져와 별도 선택 로직에서 최대 3개를 고른다.
- RAG 고도화 단계에서는 현재 규칙 기반 관련도 점수를 벡터 검색/RAG와 통합한다.
- 과세특/행동특성 일괄 생성, 품질 관리, 결과 편집, 최종본 확정, 결과 엑셀 다운로드는 완료됐다.

## 중요한 설계 결정

- 교과서 PDF 업로드는 하지 않는다.
- 서버 용량 및 저작권 문제 때문에 교과서 원문은 저장하지 않는다.
- 과목 관리는 `curriculum_subjects`를 단일 마스터로 사용한다.
- `subjects` 테이블은 deprecated 상태이며 즉시 삭제하지 않는다.
- 과세특 과목 선택, 성취기준 업로드 매칭, 성취기준 검색은 모두 `curriculum_subjects`와 `curriculum_standards` 기준으로 동작한다.
- `/admin/subjects`는 더 이상 별도 과목 관리 화면으로 사용하지 않는다.
- 성취기준, 단원명, 핵심키워드만 관리한다.
- teacher도 성취기준 업로드가 가능하다.
- admin만 과목 생성, 수정, 삭제를 수행한다.
- 중복 업로드 방지를 위해 정확 중복과 유사 중복 검사를 모두 수행한다.
- 성취기준 랜덤/분산 선택은 과세특 생성 로직에만 적용하며 행동특성 생성 로직, 학생 CRUD, 관리자 기능, 성취기준 업로드 기능은 수정하지 않는다.
- 과세특 일괄 생성은 기존 단일 과세특 생성 API를 학생별로 재사용하며, 클라이언트에서 동시 실행 수를 3개로 제한한다.
- 과세특 일괄 생성 성공 결과는 `record_drafts`에 자동 저장한다.
- `/bulk-subject-comment`의 화면 우선순위는 공통 설정, 학생별 입력 테이블, 생성 버튼, 생성 결과, 일괄 적용 보조 기능 순서로 유지한다.
- 행동특성 일괄 생성은 기존 단일 행동특성 생성 API를 학생별로 재사용하며, 클라이언트에서 동시 실행 수를 3개로 제한한다.
- 행동특성 일괄 생성 성공 결과는 `record_drafts`에 `mode=behavior`로 자동 저장한다.
- 행동특성 일괄 생성 payload는 `schoolLifeAreas`와 `industrialAttitudes`를 분리한다. 학교생활 영역은 `schoolLifeAreas`, 생활태도 키워드/협업·관계/책임감·성실성은 `industrialAttitudes`로 전달한다.
- 생성 품질 관리는 기존 생성 API, 학생 CRUD, 관리자 기능, 성취기준 조회 로직을 수정하지 않고 일괄 생성 UI 후처리와 저장 함수 옵션으로만 연결한다.
- 중복도 분석 대상은 이번 생성에서 성공한 학생 초안으로 제한한다.
- 중복 의심 선택 재생성은 기존 payload를 사용해 같은 생성 API를 재호출하고, 새 AI 결과 후보를 표시한 뒤 교사가 `새 결과 사용`을 선택할 때만 `edited_content`에 저장한다.
- 복사와 엑셀 다운로드는 항상 `final_content`, `edited_content`, `ai_content` 순서로 출력 내용을 선택한다.
- `/bulk-behavior-comment`에는 과목명, 단원명, 성취기준 입력을 두지 않는다.
- `/bulk-behavior-comment`의 화면 우선순위는 공통 설정, 학생별 입력 테이블, 생성 버튼, 생성 결과, 일괄 적용 보조 기능 순서로 유지한다.
- 레이아웃 변경은 기능 로직을 건드리지 않고 Tailwind class, 컨테이너 폭, grid/flex 최소 폭, overflow 경계만 조정한다.
- 학생별 입력 테이블은 컬럼 수가 많으므로 테이블 내부 가로 스크롤은 허용하지만 페이지 전체 가로 스크롤은 허용하지 않는다.

## 다음 채팅에서 작업할 때 주의사항

- `README.md` 먼저 읽기
- `PROJECT_STATUS.md` 먼저 읽기
- 기존 Auth 구조 수정 금지
- 기존 학생 CRUD 수정 최소화
- 관리자 기능 유지
- `settingsOptions` fallback 흐름 유지
- GitHub 업로드 시 폴더 구조 유지
- 코드 변경 후에는 `npm run typecheck`와 `npm run build` 확인
- `npm run build` 후 개발 서버 화면 스타일이 깨지면 dev 서버 재시작

## 현재 주의할 점

- 앱 라우트 보호 미들웨어는 아직 없다.
- `/dashboard`, `/students`, `/subject-comment`, `/bulk-subject-comment`, `/behavior-comment`, `/bulk-behavior-comment`, `/knowledge`는 페이지 자체 접근이 가능하지만 실제 데이터 작업은 로그인 사용자 확인 후 수행된다.
- 사용자 브라우저 localStorage 안에는 과거 버전 데이터가 남아 있을 수 있으나, 현재 학생 목록/학생부 초안 저장은 Supabase DB 기준이다.
- `supabase/schema.sql`은 과거 `profiles` 기반 구조가 남아 있을 수 있으므로, 실제 기준은 최신 migration 파일이다.
