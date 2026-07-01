import { AppShell } from "@/components/AppShell";
import { BulkBehaviorCommentComposer } from "@/components/BulkBehaviorCommentComposer";
import { CommentComposerTabs } from "@/components/CommentComposerTabs";

export default function BulkBehaviorCommentPage() {
  return (
    <AppShell>
      <div className="min-w-0 space-y-4">
        <CommentComposerTabs section="behavior" activeTab="bulk" />
        <BulkBehaviorCommentComposer />
      </div>
    </AppShell>
  );
}
