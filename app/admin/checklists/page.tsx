import { AdminChecklistManager } from "@/components/AdminChecklistManager";
import { AdminGuard } from "@/components/AdminGuard";
import { AppShell } from "@/components/AppShell";

export default function AdminChecklistsPage() {
  return (
    <AppShell>
      <AdminGuard>
        <AdminChecklistManager />
      </AdminGuard>
    </AppShell>
  );
}
