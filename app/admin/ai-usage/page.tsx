import { AdminAiUsageDashboard } from "@/components/AdminAiUsageDashboard";
import { AdminGuard } from "@/components/AdminGuard";
import { AppShell } from "@/components/AppShell";

export default function AdminAiUsagePage() {
  return (
    <AppShell>
      <AdminGuard>
        <AdminAiUsageDashboard />
      </AdminGuard>
    </AppShell>
  );
}
