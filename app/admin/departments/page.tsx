import { AdminDepartmentManager } from "@/components/AdminDepartmentManager";
import { AdminGuard } from "@/components/AdminGuard";
import { AppShell } from "@/components/AppShell";

export default function AdminDepartmentsPage() {
  return (
    <AppShell>
      <AdminGuard>
        <AdminDepartmentManager />
      </AdminGuard>
    </AppShell>
  );
}
