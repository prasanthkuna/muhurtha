import type { Metadata } from "next";
import { PolicyPage, SUPPORT_EMAIL } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Pricing — Muhūrta",
  description: "Muhūrta Free and Pro plans: ₹99 a month or ₹499 a year.",
};

export default function PricingPage() {
  return (
    <PolicyPage
      title="Pricing"
      intro="Muhūrta is a Jyotish (Vedic astrology) timing companion. Most of it is free. Muhūrta Pro adds family charts, every language and unlimited timing."
    >
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line p-5">
          <h2>Free</h2>
          <p className="mt-1 font-serif text-3xl text-ink">₹0</p>
          <ul className="mt-3 text-sm">
            <li>Your own birth chart, Today, Decode and your current Life chapter</li>
            <li>Daily 6:45 AM brief and timing alerts</li>
            <li>Share cards</li>
            <li>3 Ask questions a day</li>
            <li>3 Timing checks and 3 Find-a-date searches a day</li>
            <li>Your reading in the language you choose at sign-up</li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-gold-accent p-5">
          <h2>Pro</h2>
          <p className="mt-1 font-serif text-3xl text-ink">
            ₹99<span className="text-base text-ink-tertiary"> / month</span>
          </p>
          <p className="text-sm text-ink-secondary">or ₹499 / year (about ₹42 a month)</p>
          <ul className="mt-3 text-sm">
            <li>Everything in Free</li>
            <li>Family and friend charts (up to 10)</li>
            <li>Change language any time (English, Telugu, Hindi)</li>
            <li>Unlimited Timing checks and Find-a-date</li>
            <li>Up to 30 Ask questions a day (fair use)</li>
            <li>Every Life chapter, weekly and monthly guidance</li>
          </ul>
        </div>
      </section>
      <section>
        <h2>How billing works</h2>
        <ul>
          <li>Prices are in Indian Rupees (INR) and include all applicable taxes.</li>
          <li>Pro on the web app is billed by Razorpay using UPI Autopay, debit/credit card or netbanking.</li>
          <li>Pro is a subscription that renews automatically every month or year until you cancel. Your bank or UPI app notifies you before each renewal.</li>
          <li>There is no free trial. Pro starts as soon as the first payment succeeds.</li>
          <li>Cancel any time in the app under Settings › Your plan. You keep Pro until the end of the period you paid for. See the <a className="text-gold-text" href="/refund">Refund &amp; cancellation policy</a>.</li>
          <li>Pro bought in the Android app is billed by Google Play and managed in the Play Store.</li>
        </ul>
      </section>
      <section>
        <h2>Delivery</h2>
        <p>Muhūrta is a digital service. There is nothing to ship: Pro features unlock in your account immediately after payment, on every device where you sign in.</p>
      </section>
      <section>
        <h2>Questions</h2>
        <p>
          Email <a className="text-gold-text" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We reply within 2 working days.
        </p>
      </section>
    </PolicyPage>
  );
}
