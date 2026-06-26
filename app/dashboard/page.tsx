import Link from "next/link";
import { BookOpenText, ClipboardList, Database, ListChecks, PenLine, UsersRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const actions = [
  {
    href: "/subject-comment",
    title: "세특 작성",
    description: "실습 활동과 교사 관찰 메모를 바탕으로 세특 초안을 생성합니다.",
    icon: PenLine
  },
  {
    href: "/bulk-subject-comment",
    title: "과세특 일괄 생성",
    description: "여러 학생의 활동유형, 역량, 보완점, 관찰 메모를 한 화면에서 입력하고 생성합니다.",
    icon: ListChecks
  },
  {
    href: "/behavior-comment",
    title: "행동특성 작성",
    description: "태도, 협업, 책임감, 보완 노력을 중심으로 종합의견을 생성합니다.",
    icon: ClipboardList
  },
  {
    href: "/bulk-behavior-comment",
    title: "행동특성 일괄 생성",
    description: "여러 학생의 생활태도, 관계, 책임감, 담임 관찰 메모를 한 화면에서 입력하고 생성합니다.",
    icon: ClipboardList
  },
  {
    href: "/knowledge",
    title: "문서 업로드",
    description: "교과서 학습목표, 교육과정, NCS, 루브릭 파일을 RAG 근거로 등록합니다.",
    icon: Database
  },
  {
    href: "/admin/curriculum",
    title: "과목/성취기준 관리",
    description: "과목 마스터와 과목별 성취기준, 핵심키워드를 관리합니다.",
    icon: BookOpenText
  },
  {
    href: "/students",
    title: "학생 관리",
    description: "작성 대상 학생을 등록하고 학년, 학과, 반 정보를 관리합니다.",
    icon: UsersRound
  }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">MVP 대시보드</p>
              <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">오늘의 학생부 작성</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                학년, 과목, 단원, 활동 유형, 역량, 보완점, 관찰 메모를 입력해 실제 관찰 중심의 학생부 초안을 만듭니다.
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <BookOpenText size={25} aria-hidden="true" />
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-200"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-slate-950">{action.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
              </Link>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="panel p-4">
            <p className="text-sm font-semibold text-slate-500">작성 원칙</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">관찰 근거</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">AI는 입력된 교사 관찰 메모와 체크 항목 안에서만 문장을 생성합니다.</p>
          </div>
          <div className="panel p-4">
            <p className="text-sm font-semibold text-slate-500">지원 화면</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">8개</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">대시보드, 세특, 일괄 세특, 행동특성, 일괄 행특, 문서, 과목/성취기준, 학생 관리를 제공합니다.</p>
          </div>
          <div className="panel p-4">
            <p className="text-sm font-semibold text-slate-500">앱 형태</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">PWA</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">모바일 홈 화면에 설치 가능한 앱 형태로 구성했습니다.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
