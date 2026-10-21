import { AppDataProvider } from "@/context/app-data-context";
import { LocaleProvider } from "@/context/locale-context";
import { TimingNotificationsSync } from "@/components/engagement/timing-notifications-sync";
import { SwRegister } from "@/components/pwa/sw-register";
import { AppShell } from "@/components/shell/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AppDataProvider>
        <SwRegister />
        <TimingNotificationsSync />
        <AppShell>{children}</AppShell>
      </AppDataProvider>
    </LocaleProvider>
  );
}
