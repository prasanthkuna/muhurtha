import type { Metadata } from "next";
import { PolicyPage, SUPPORT_EMAIL } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Contact — Muhūrta",
  description: "Contact Muhūrta support.",
};

export default function ContactPage() {
  return (
    <PolicyPage title="Contact us" intro="We're a small team building Muhūrta in Hyderabad. Write to us about your account, payments, refunds or data.">
      <section className="rounded-2xl border border-line p-5">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-ink-tertiary">Email</dt>
            <dd className="text-base">
              <a className="text-gold-text" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </dd>
          </div>
          <div>
            <dt className="text-ink-tertiary">Operated by</dt>
            <dd className="text-base text-ink">Prasanth Kuna (Muhūrta)</dd>
          </div>
          <div>
            <dt className="text-ink-tertiary">Location</dt>
            <dd className="text-base text-ink">Hyderabad, Telangana, India</dd>
          </div>
          <div>
            <dt className="text-ink-tertiary">Response time</dt>
            <dd className="text-base text-ink">Within 2 working days</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>Payments and refunds</h2>
        <p>Include the phone number or email on your account and the payment date so we can find your payment quickly. See our <a className="text-gold-text" href="/refund">Refund &amp; cancellation policy</a>.</p>
      </section>
      <section>
        <h2>Account deletion</h2>
        <p>You can request deletion of your account and data at <a className="text-gold-text" href="https://muhurta-legal.vercel.app/delete-account">muhurta-legal.vercel.app/delete-account</a> or by email.</p>
      </section>
    </PolicyPage>
  );
}
