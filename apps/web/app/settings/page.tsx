import { AppShell } from "../../components/AppShell";
import { SettingsView } from "../../components/WorkspaceViews";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="AI, MySQL, WhatsApp, and privacy configuration.">
      <SettingsView />
    </AppShell>
  );
}
