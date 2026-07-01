import { AppShell } from "@/components/AppShell";
import { CommentComposerTabs } from "@/components/CommentComposerTabs";
import { RecordComposer } from "@/components/RecordComposer";

export default function SubjectCommentPage() {
  return (
    <AppShell>
      <div className="min-w-0 space-y-4">
        <CommentComposerTabs section="subject" activeTab="single" />
        <RecordComposer mode="subject" />
      </div>
    </AppShell>
  );
}
