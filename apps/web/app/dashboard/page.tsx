import { AppShell } from "../../components/AppShell";
import { DashboardClient } from "../../components/DashboardClient";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" subtitle="Prioritize WhatsApp leads while respecting consent and cooldowns.">
      <DashboardClient />
    </AppShell>
  );
}
