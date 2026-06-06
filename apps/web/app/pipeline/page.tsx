import { AppShell } from "../../components/AppShell";
import { PipelineView } from "../../components/WorkspaceViews";

export default function PipelinePage() {
  return (
    <AppShell title="Pipeline" subtitle="Kanban view for lead status and follow-up stages.">
      <PipelineView />
    </AppShell>
  );
}
