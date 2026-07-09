import { AdminGuard } from "@/components/AdminGuard";
import { AdminSchoolChangeRequests } from "@/components/AdminSchoolChangeRequests";
import { AppShell } from "@/components/AppShell";

export default function AdminSchoolRequestsPage() {
  return (
    <AppShell>
      <AdminGuard>
        <AdminSchoolChangeRequests />
      </AdminGuard>
    </AppShell>
  );
}
