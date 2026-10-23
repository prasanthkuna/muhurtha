import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, SUPPORT_EMAIL } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Muhūrta",
  description: "What Muhūrta collects, why, who processes it, and how to delete your data.",
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      intro="This policy explains how Muhūrta (“we”, “us”) collects, uses and shares information when you use the Muhūrta web app and Android app. Developer: Prasanth Kuna, Hyderabad, Telangana, India."
    >
      <section>
        <h2>Information we collect</h2>
        <ul>
          <li><strong>Account:</strong> your email address or phone number and sign-in details from Google or Supabase Auth.</li>
          <li><strong>Birth and profile details:</strong> name, date, time and place of birth, current city, language, and charts you add for family members.</li>
          <li><strong>Location:</strong> with your permission, your city and timezone so timings match where you are.</li>
          <li><strong>App content:</strong> your reading, Today cards, life chapters, timing checks and Ask questions and answers.</li>
          <li><strong>Payments:</strong> subscription status, plan and payment references from Razorpay (web) or Google Play (Android). We never see or store your full card number, UPI PIN or bank password.</li>
          <li><strong>Notifications:</strong> if you turn them on, a push subscription token for your browser or device.</li>
          <li><strong>Technical logs:</strong> app version, errors and basic usage events to keep the service reliable.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To sign you in and keep your profile.</li>
          <li>To calculate Panchanga timings and write your personal reading, Today cards and Ask answers.</li>
          <li>To process and manage subscriptions, prevent fraud and handle refunds.</li>
          <li>To send notifications you asked for, and to improve reliability, security and support.</li>
        </ul>
      </section>
      <section>
        <h2>Who processes it</h2>
        <p>We do not sell your personal data. We share it only with providers that help run Muhūrta:</p>
        <ul>
          <li><strong>Supabase</strong> — authentication, database and backend functions.</li>
          <li><strong>Vercel</strong> — web hosting.</li>
          <li><strong>OpenAI</strong> (and, if it is unavailable, Google Gemini) — to write reading and Ask text from your chart details. Your data is sent only to generate your content.</li>
          <li><strong>Razorpay</strong> — web payments and UPI Autopay subscriptions.</li>
          <li><strong>Google Play and RevenueCat</strong> — Android billing.</li>
          <li><strong>Browser push services</strong> (for example Google Firebase Cloud Messaging) — to deliver notifications you enabled.</li>
        </ul>
        <p>We may disclose information if the law requires it or to protect rights, safety and security.</p>
      </section>
      <section>
        <h2>Retention and deletion</h2>
        <p>
          We keep your data while your account is active. Request deletion any time from the{" "}
          <Link href="/delete-account" className="text-gold-text">delete account</Link> page or by emailing{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gold-text">{SUPPORT_EMAIL}</a>. We delete or anonymise personal data
          within 30 days, except payment records we must keep under Indian tax and accounting law.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <ul>
          <li>Turn location or notifications off in your browser or phone settings.</li>
          <li>Cancel Pro in Settings › Your plan (web) or Google Play (Android).</li>
          <li>Ask us for a copy of your data, a correction, or deletion.</li>
        </ul>
      </section>
      <section>
        <h2>Children</h2>
        <p>Muhūrta is not meant for children under 13 to use on their own. A parent may add a child&apos;s chart; that data belongs to the parent&apos;s account and is deleted with it.</p>
      </section>
      <section>
        <h2>Security and transfers</h2>
        <p>We use encrypted connections and access controls. Data may be processed in India and other countries where our providers operate, with appropriate safeguards. No system is 100% secure.</p>
      </section>
      <section>
        <h2>Changes and contact</h2>
        <p>We may update this policy; the “Last updated” date above will change. Questions or complaints (grievance officer): Prasanth Kuna, <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gold-text">{SUPPORT_EMAIL}</a>.</p>
      </section>
    </PolicyPage>
  );
}
