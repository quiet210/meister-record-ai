# 공업계 고등학교 학생부 작성 지원 MVP

Next.js App Router, TypeScript, TailwindCSS, OpenAI API, Supabase 클라이언트 준비, PWA를 적용한 학생부 초안 생성 MVP입니다.

## 실행

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`.env.local`에 `GEMINI_API_KEY`를 설정하면 세특/행동특성 작성 화면의 생성 버튼이 Next.js 서버 API Route를 통해 Gemini API를 호출합니다. 문서 업로드와 OpenAI Vector Store 기반 RAG 실험을 계속 쓰는 경우에는 OpenAI/Supabase 환경변수도 함께 설정합니다.

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
OPENAI_VECTOR_STORE_ID=vs_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_STORAGE_BUCKET=knowledge-files
DEFAULT_SCHOOL_ID=demo-school
```

## 주요 화면

- `/login`
- `/dashboard`
- `/subject-comment`
- `/behavior-comment`
- `/students`
- `/knowledge`

## 구현 범위

- 모바일 우선 반응형 UI
- PWA manifest 및 service worker 등록
- 세특 작성 입력 폼
- 행동특성 및 종합의견 작성 입력 폼
- 학생 관리 로컬 저장
- PDF/DOCX/TXT/CSV 지식베이스 업로드
- OpenAI Files + Vector Store 기반 RAG 검색
- Gemini API 서버 라우트
- Supabase 클라이언트 준비 파일
