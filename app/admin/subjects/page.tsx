import { AdminGuard } from "@/components/AdminGuard";
import { AdminSubjectManager } from "@/components/AdminSubjectManager";
import { AppShell } from "@/components/AppShell";

export default function AdminSubjectsPage() {
  return (
    <AppShell>
      <AdminGuard>
        <AdminSubjectManager />
      </AdminGuard>
    </AppShell>
  );
}
