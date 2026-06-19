import { AppShell } from "@/components/AppShell";
import { RecordComposer } from "@/components/RecordComposer";

export default function SubjectCommentPage() {
  return (
    <AppShell>
      <RecordComposer mode="subject" />
    </AppShell>
  );
}
