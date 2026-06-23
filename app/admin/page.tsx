import { AdminGuard } from "@/components/AdminGuard";
import { AdminHome } from "@/components/AdminHome";
import { AppShell } from "@/components/AppShell";

export default function AdminPage() {
  return (
    <AppShell>
      <AdminGuard>
        <AdminHome />
      </AdminGuard>
    </AppShell>
  );
}
