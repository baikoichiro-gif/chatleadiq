import { AppShell } from "../../../components/AppShell";
import { LeadDetailView } from "../../../components/WorkspaceViews";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppShell title="Lead Detail" subtitle="Chat timeline, score breakdown, suggested reply, and audit context.">
      <LeadDetailView id={params.id} />
    </AppShell>
  );
}
