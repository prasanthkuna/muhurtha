import { LocaleProvider } from "@/context/locale-context";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
