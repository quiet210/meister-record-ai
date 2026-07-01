"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpenCheck, BookOpenText, ClipboardList, FileText, PenLine, Settings, UsersRound, type LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { ensureUserProfile } from "@/lib/students";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  activeHrefs?: string[];
};

const navItems: NavItem[] = [
  { href: "/subject-comment", label: "과세특", icon: PenLine, activeHrefs: ["/bulk-subject-comment"] },
  { href: "/behavior-comment", label: "행동특성", icon: ClipboardList, activeHrefs: ["/bulk-behavior-comment"] },
  { href: "/students", label: "학생 관리", icon: UsersRound },
  { href: "/student-records", label: "학생부 관리", icon: FileText },
  { href: "/admin/curriculum", label: "과목/성취기준", icon: BookOpenText },
];

const adminNavItem: NavItem = {
  href: "/admin",
  label: "관리자",
  icon: Settings,
  activeHrefs: ["/admin/departments", "/admin/subjects", "/admin/checklists"]
};

export function AppShell({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const visibleNavItems = isAdmin ? [...navItems, adminNavItem] : navItems;

  function isActiveNavItem(item: NavItem) {
    return [item.href, ...(item.activeHrefs || [])].includes(pathname);
  }

  useEffect(() => {
    let isMounted = true;

    ensureUserProfile().then((result) => {
      if (!isMounted) return;
      setIsAdmin(result.profile?.role === "admin");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 pb-20 text-slate-950 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between px-4 py-3 lg:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
              <BookOpenCheck size={20} aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-bold text-slate-900 lg:text-base">실습기록 AI 학생부 도우미</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1760px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-6 lg:py-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden min-w-0 lg:block">
          <nav className="sticky top-20 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveNavItem(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                    isActive ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white hover:text-blue-700"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white lg:hidden"
        style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
      >
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveNavItem(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition ${
                isActive ? "text-blue-700" : "text-slate-600"
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
