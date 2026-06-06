import { AppShell } from "../../components/AppShell";
import { ChatsClient } from "../../components/DashboardClient";

export default function ChatsPage() {
  return (
    <AppShell title="Chats" subtitle="Search and analyze WhatsApp conversations stored in MySQL.">
      <ChatsClient />
    </AppShell>
  );
}
