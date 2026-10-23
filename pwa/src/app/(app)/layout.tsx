import { AppDataProvider } from "@/context/app-data-context";
import { LocaleProvider } from "@/context/locale-context";
import { TimingNotificationsSync } from "@/components/engagement/timing-notifications-sync";
import { AppShell } from "@/components/shell/app-shell";
import { PaywallProvider } from "@/context/paywall-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AppDataProvider>
        <PaywallProvider>
          <TimingNotificationsSync />
          <AppShell>{children}</AppShell>
        </PaywallProvider>
      </AppDataProvider>
    </LocaleProvider>
  );
}
