import type { Metadata } from "next";
import { PolicyPage, SUPPORT_EMAIL } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Delete your account — Muhūrta",
  description: "How to delete your Muhūrta account and data.",
};

const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Muhūrta account deletion request")}&body=${encodeURIComponent(
  "Please delete my Muhūrta account and associated data.\n\nEmail or phone on the account: ",
)}`;

export default function DeleteAccountPage() {
  return (
    <PolicyPage title="Delete your account" intro="You can ask us to delete your Muhūrta account and all of its data at any time.">
      <section>
        <h2>How to request deletion</h2>
        <ul>
          <li>Email <a href={mailto} className="text-gold-text">{SUPPORT_EMAIL}</a> from the email on your account, or include the phone number you sign in with.</li>
          <li>If you have an active Pro subscription, cancel it first in Settings › Your plan so you are not charged again.</li>
        </ul>
      </section>
      <section>
        <h2>What we delete</h2>
        <p>Your profile, birth details, family charts, readings, Ask history, notification settings and share cards. We complete deletion within 30 days. Payment records we must keep under Indian tax law are retained without your reading data.</p>
      </section>
    </PolicyPage>
  );
}
