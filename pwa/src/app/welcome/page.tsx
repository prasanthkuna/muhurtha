import type { Metadata } from "next";
import { WelcomeScreen } from "./welcome-client";
import { LocaleProvider } from "@/context/locale-context";
import { AttributionCapture } from "@/components/share/attribution-capture";

export const metadata: Metadata = {
  title: "Muhūrta — your birth star, decoded",
  description:
    "Your birth star decoded, your life in chapters from birth to 80, today's good hours for your city, and a 36-guna match. In English, తెలుగు and हिन्दी.",
  openGraph: {
    title: "Muhūrta — your birth star, decoded",
    description: "Decode, Life, Today, Bond and Ask. In English, తెలుగు, हिन्दी.",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
  },
};

/** Static shell (fast first paint); today's panchang comes from the CDN-cached public route. */
export default function WelcomePage() {
  return (
    <LocaleProvider>
      <AttributionCapture />
      <WelcomeScreen panchang={null} />
    </LocaleProvider>
  );
}
