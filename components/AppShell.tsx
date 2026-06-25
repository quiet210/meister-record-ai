"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpenCheck, BookOpenText, ClipboardList, Database, Home, PenLine, Settings, UsersRound } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { ensureUserProfile } from "@/lib/students";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: Home },
  { href: "/subject-comment", label: "세특 작성", icon: PenLine },
  { href: "/behavior-comment", label: "행동특성", icon: ClipboardList },
  { href: "/knowledge", label: "문서", icon: Database },
  { href: "/admin/curriculum", label: "과목/성취기준", icon: BookOpenText },
  { href: "/students", label: "학생 관리", icon: UsersRound }
];

const adminNavItem = { href: "/admin", label: "관리", icon: Settings };

export function AppShell({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const visibleNavItems = isAdmin ? [...navItems, adminNavItem] : navItems;

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
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-950 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
              <BookOpenCheck size={20} aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-bold text-slate-900 lg:text-base">실습기록 AI 학생부 도우미</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[220px_1fr] lg:px-6 lg:py-6">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-600 hover:bg-white hover:text-blue-700"
                >
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white lg:hidden"
        style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
      >
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-slate-600">
              <Icon size={20} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
