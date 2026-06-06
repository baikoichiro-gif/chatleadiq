import { AppShell } from "../../components/AppShell";
import { ConnectClient } from "../../components/ConnectClient";

export default function ConnectPage() {
  return (
    <AppShell title="Connect WhatsApp" subtitle="QR login, session status, reconnect controls, and safety state.">
      <ConnectClient />
    </AppShell>
  );
}
