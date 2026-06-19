import { AppShell } from "@/components/AppShell";
import { RecordComposer } from "@/components/RecordComposer";

export default function BehaviorCommentPage() {
  return (
    <AppShell>
      <RecordComposer mode="behavior" />
    </AppShell>
  );
}
