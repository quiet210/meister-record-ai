import Link from "next/link";
import { BookOpenCheck, BookOpenText, ClipboardList, FileText, PenLine, UsersRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const actions = [
  {
    href: "/subject-comment",
    title: "과세특 작성",
    description: "학생별 과목, 단원, 활동 내용, 관찰 메모를 바탕으로 과세특 초안을 작성합니다.",
    icon: PenLine
  },
  {
    href: "/behavior-comment",
    title: "행동특성 작성",
    description: "생활태도, 협업, 책임감, 담임 관찰 메모를 바탕으로 행동특성 초안을 작성합니다.",
    icon: ClipboardList
  },
  {
    href: "/students",
    title: "학생 관리",
    description: "작성 대상 학생을 등록하고 학년, 학과, 반 정보를 관리합니다.",
    icon: UsersRound
  },
  {
    href: "/student-records",
    title: "학생부 관리",
    description: "학생별 과세특과 행동특성의 AI 원본, 수정본, 최종본을 확인합니다.",
    icon: FileText
  },
  {
    href: "/admin/curriculum",
    title: "과목/성취기준",
    description: "과목 목록과 성취기준을 확인하고 업로드합니다.",
    icon: BookOpenText
  }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="min-w-0 space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">학생부 작성</p>
              <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">오늘의 작업을 선택하세요</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                자주 사용하는 작성과 관리 화면만 모았습니다. 과세특과 행동특성의 일괄 작성은 각 작성 화면의 탭에서 바로 전환할 수 있습니다.
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <BookOpenCheck size={25} aria-hidden="true" />
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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
      </div>
    </AppShell>
  );
}
