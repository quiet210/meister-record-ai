import { AppShell } from "@/components/AppShell";
import { BulkSubjectCommentComposer } from "@/components/BulkSubjectCommentComposer";
import { CommentComposerTabs } from "@/components/CommentComposerTabs";

export default function BulkSubjectCommentPage() {
  return (
    <AppShell>
      <div className="min-w-0 space-y-4">
        <CommentComposerTabs section="subject" activeTab="bulk" />
        <BulkSubjectCommentComposer />
      </div>
    </AppShell>
  );
}
