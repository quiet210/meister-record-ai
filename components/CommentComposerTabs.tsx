import Link from "next/link";
import { ListChecks, PenLine } from "lucide-react";

type CommentSection = "subject" | "behavior";
type CommentTab = "single" | "bulk";

type CommentComposerTabsProps = {
  section: CommentSection;
  activeTab: CommentTab;
};

const tabConfig = {
  subject: {
    ariaLabel: "과세특 작성 방식",
    tabs: [
      { key: "single", href: "/subject-comment", label: "개별 작성", icon: PenLine },
      { key: "bulk", href: "/bulk-subject-comment", label: "일괄 작성", icon: ListChecks }
    ]
  },
  behavior: {
    ariaLabel: "행동특성 작성 방식",
    tabs: [
      { key: "single", href: "/behavior-comment", label: "개별 작성", icon: PenLine },
      { key: "bulk", href: "/bulk-behavior-comment", label: "일괄 작성", icon: ListChecks }
    ]
  }
} satisfies Record<
  CommentSection,
  {
    ariaLabel: string;
    tabs: Array<{
      key: CommentTab;
      href: string;
      label: string;
      icon: typeof PenLine;
    }>;
  }
>;

export function CommentComposerTabs({ section, activeTab }: CommentComposerTabsProps) {
  const config = tabConfig[section];

  return (
    <nav aria-label={config.ariaLabel} className="grid grid-cols-2 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm sm:inline-grid sm:min-w-[320px]">
      {config.tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === activeTab;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
              isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
            }`}
          >
            <Icon size={17} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
