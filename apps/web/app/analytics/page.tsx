import { AppShell } from "../../components/AppShell";
import { AnalyticsView } from "../../components/WorkspaceViews";

export default function AnalyticsPage() {
  return (
    <AppShell title="Analytics" subtitle="Lead distribution, objections, product interest, and scoring trends.">
      <AnalyticsView />
    </AppShell>
  );
}
