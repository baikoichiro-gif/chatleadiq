import { AppShell } from "../../components/AppShell";
import { FollowupsView } from "../../components/WorkspaceViews";

export default function FollowupsPage() {
  return (
    <AppShell title="Follow-ups" subtitle="Today, overdue, tomorrow, and do-not-contact warnings.">
      <FollowupsView />
    </AppShell>
  );
}
