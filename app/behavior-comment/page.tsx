import { AppShell } from "@/components/AppShell";
import { CommentComposerTabs } from "@/components/CommentComposerTabs";
import { RecordComposer } from "@/components/RecordComposer";

export default function BehaviorCommentPage() {
  return (
    <AppShell>
      <div className="min-w-0 space-y-4">
        <CommentComposerTabs section="behavior" activeTab="single" />
        <RecordComposer mode="behavior" />
      </div>
    </AppShell>
  );
}
