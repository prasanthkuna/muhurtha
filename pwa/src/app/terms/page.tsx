import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, SUPPORT_EMAIL } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Terms of Service — Muhūrta",
  description: "The terms for using Muhūrta on the web and on Android, including Muhūrta Pro subscriptions.",
};

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      intro="By using Muhūrta on the web (pwa-lyart-phi.vercel.app) or in the Android app, you agree to these Terms. If you do not agree, please do not use the service."
    >
      <section>
        <h2>The service</h2>
        <p>
          Muhūrta gives Jyotish-based timing guidance, birth-chart readings (Decode, Life chapters, Today and Timing) and an Ask
          feature, for personal, non-commercial use. Readings are written with the help of AI from traditional calculations. They
          are informational and reflective — not medical, legal, financial or other professional advice, and we do not promise any
          particular outcome.
        </p>
      </section>
      <section>
        <h2>Who can use it</h2>
        <p>You must be at least 13 years old and able to enter a binding contract under Indian law. A parent or guardian may add a chart for their child and is responsible for that use.</p>
      </section>
      <section>
        <h2>Your account</h2>
        <ul>
          <li>You sign in with Google, a one-time password or an email and password we issue. Keep your sign-in method secure; you are responsible for activity on your account.</li>
          <li>Give accurate birth details. You can correct them as described in the app; some edits are limited to protect the service.</li>
        </ul>
      </section>
      <section>
        <h2>Muhūrta Pro subscriptions</h2>
        <ul>
          <li>Muhūrta Pro costs ₹99 per month or ₹499 per year (INR, inclusive of applicable taxes). Current prices are on the <Link href="/pricing" className="text-gold-text">Pricing</Link> page.</li>
          <li>On the web app, Pro is billed by Razorpay (UPI Autopay, card or netbanking). In the Android app, Pro is billed by Google Play.</li>
          <li>Subscriptions renew automatically at the end of each period until you cancel. There is no free trial. Pro starts as soon as the first payment succeeds.</li>
          <li>Cancel a web subscription any time in Settings › Your plan, or by emailing us; Google Play subscriptions are cancelled in Google Play › Payments &amp; subscriptions. You keep Pro until the end of the period you paid for.</li>
          <li>Refunds follow our <Link href="/refund" className="text-gold-text">Refund &amp; cancellation policy</Link> (web) or Google Play&apos;s policies (Android).</li>
          <li>Free accounts include limited features (for example, 3 Ask questions a day). Pro includes up to 30 Ask questions a day, family charts, every life chapter, and reading in another language.</li>
        </ul>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>Do not misuse the service: no unauthorised access, scraping, reverse engineering, reselling, automated bulk use, or unlawful use. We may limit use that looks abusive.</p>
      </section>
      <section>
        <h2>Intellectual property</h2>
        <p>Muhūrta, its name, design, software and the presentation of readings belong to us or our licensors. You get a limited, personal, non-transferable licence to use the service and to share the share cards it creates.</p>
      </section>
      <section>
        <h2>Disclaimer and liability</h2>
        <p>
          The service is provided “as is”. To the maximum extent permitted by law, we are not liable for indirect, incidental or
          consequential losses arising from your use of Muhūrta, and our total liability is limited to the amount you paid us in the
          three months before the claim. Nothing here limits rights you have under Indian consumer law.
        </p>
      </section>
      <section>
        <h2>Ending the service</h2>
        <p>You can stop using Muhūrta any time and ask us to delete your account (see the <Link href="/privacy" className="text-gold-text">Privacy Policy</Link>). We may suspend accounts that break these Terms.</p>
      </section>
      <section>
        <h2>Governing law</h2>
        <p>These Terms are governed by the laws of India. Courts in Hyderabad, Telangana have exclusive jurisdiction, subject to mandatory consumer protections.</p>
      </section>
      <section>
        <h2>Changes and contact</h2>
        <p>We may update these Terms; the “Last updated” date above will change. Questions: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gold-text">{SUPPORT_EMAIL}</a>.</p>
      </section>
    </PolicyPage>
  );
}
