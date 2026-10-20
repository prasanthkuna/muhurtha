import { AppDataProvider } from "@/context/app-data-context";
import { TimingNotificationsSync } from "@/components/engagement/timing-notifications-sync";
import { AppShell } from "@/components/shell/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <TimingNotificationsSync />
      <AppShell>{children}</AppShell>
    </AppDataProvider>
  );
}
