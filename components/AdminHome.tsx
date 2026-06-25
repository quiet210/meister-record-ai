import Link from "next/link";
import { BookOpenText, ClipboardCheck, Factory, Settings } from "lucide-react";

const adminLinks = [
  {
    href: "/admin/departments",
    title: "학과 관리",
    description: "학교별 학과 코드를 추가하고 화면 표시명을 수정합니다.",
    icon: Factory
  },
  {
    href: "/admin/curriculum",
    title: "과목/성취기준 관리",
    description: "학교 공통 과목과 과목별 성취기준 엑셀 업로드를 함께 관리합니다.",
    icon: BookOpenText
  },
  {
    href: "/admin/checklists",
    title: "체크리스트 관리",
    description: "과세특 활동유형/역량과 행동특성 체크 항목을 관리합니다.",
    icon: ClipboardCheck
  }
];

export function AdminHome() {
  return (
    <div className="space-y-5">
      <section className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Admin Settings</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">학교 설정 관리</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              학과, 과목/성취기준, 체크리스트는 로그인한 관리자 계정의 학교 ID 기준으로 분리되어 저장됩니다.
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <Settings size={25} aria-hidden="true" />
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-200"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
