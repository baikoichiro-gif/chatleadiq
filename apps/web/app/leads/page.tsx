import { AppShell } from "../../components/AppShell";
import { LeadsClient } from "../../components/DashboardClient";

export default function LeadsPage() {
  return (
    <AppShell title="Leads" subtitle="Filter by status, score, customer, and product interest.">
      <LeadsClient />
    </AppShell>
  );
}
