import { AppDataProvider } from "@/context/app-data-context";
import { LocaleProvider } from "@/context/locale-context";
import { TimingNotificationsSync } from "@/components/engagement/timing-notifications-sync";
import { AppShell } from "@/components/shell/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AppDataProvider>
        <TimingNotificationsSync />
        <AppShell>{children}</AppShell>
      </AppDataProvider>
    </LocaleProvider>
  );
}
