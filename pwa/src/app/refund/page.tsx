import type { Metadata } from "next";
import { PolicyPage, SUPPORT_EMAIL } from "@/components/legal/policy-page";

export const metadata: Metadata = {
  title: "Refund & cancellation — Muhūrta",
  description: "How to cancel Muhūrta Pro and when refunds apply.",
};

export default function RefundPage() {
  return (
    <PolicyPage
      title="Refund & cancellation policy"
      intro="This policy covers Muhūrta Pro bought on the Muhūrta web app (billed by Razorpay)."
    >
      <section>
        <h2>Cancelling</h2>
        <ul>
          <li>Cancel any time in the app: Settings › Your plan › Cancel auto-renewal. You can also email us and we will cancel it for you.</li>
          <li>Cancelling stops all future renewals. You keep Pro until the end of the month or year you already paid for, then your account moves to Free.</li>
          <li>You can also revoke the UPI Autopay mandate from your UPI app; that stops future renewals the same way.</li>
          <li>Your charts, readings and history are never deleted when Pro ends. Family charts you added stay in your account.</li>
        </ul>
      </section>
      <section>
        <h2>Refunds</h2>
        <ul>
          <li>Payments for a period that has started are generally not refundable, and we do not give partial refunds for unused days.</li>
          <li>We give a full refund if you were charged twice for the same period, charged after you cancelled, or could not use Pro because of a problem on our side. Write to us within 7 days of the charge.</li>
          <li>If you subscribed by mistake and have not used any Pro feature, write to us within 48 hours of the first payment for a full refund.</li>
          <li>Approved refunds go back to the original payment method (UPI, card or bank account) within 5–7 working days.</li>
          <li>Pro bought through Google Play follows Google Play&apos;s refund policy and is requested through Google Play.</li>
        </ul>
      </section>
      <section>
        <h2>Failed renewals</h2>
        <p>If a renewal fails, we and Razorpay retry for a few days. Pro stays on for up to 3 days while this happens. If the payment still fails, your account moves to Free; nothing else is charged.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Email <a className="text-gold-text" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the phone number or email on your account and the payment date. We reply within 2 working days.
        </p>
      </section>
    </PolicyPage>
  );
}
