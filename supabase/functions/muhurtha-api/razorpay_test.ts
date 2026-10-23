import {
  hmacSha256Hex,
  mapRazorpayStatus,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "./razorpay.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test("webhook signature: valid, tampered, wrong secret", async () => {
  const secret = "whsec_test_123";
  const body = JSON.stringify({
    event: "subscription.activated",
    payload: { subscription: { entity: { id: "sub_TEST", status: "active" } } },
  });
  const sig = await hmacSha256Hex(secret, body);
  assert(await verifyWebhookSignature(body, sig, secret), "valid signature rejected");
  assert(!(await verifyWebhookSignature(body + " ", sig, secret)), "tampered body accepted");
  assert(!(await verifyWebhookSignature(body, sig, "other")), "wrong secret accepted");
  assert(!(await verifyWebhookSignature(body, "", secret)), "empty signature accepted");
});

Deno.test("checkout signature uses payment_id|subscription_id", async () => {
  const secret = "key_secret_abc";
  const sig = await hmacSha256Hex(secret, "pay_1|sub_1");
  assert(await verifyCheckoutSignature("pay_1", "sub_1", sig, secret), "valid rejected");
  assert(!(await verifyCheckoutSignature("pay_2", "sub_1", sig, secret)), "wrong payment accepted");
});

Deno.test("known HMAC vector", async () => {
  // RFC 4231 test case 2
  const out = await hmacSha256Hex("Jefe", "what do ya want for nothing?");
  assert(
    out === "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    "HMAC mismatch",
  );
});

Deno.test("status mapping", () => {
  assert(mapRazorpayStatus("active") === "active", "active");
  assert(mapRazorpayStatus("authenticated") === "active", "authenticated");
  assert(mapRazorpayStatus("pending") === "past_due", "pending");
  assert(mapRazorpayStatus("halted") === "expired", "halted");
  assert(mapRazorpayStatus("cancelled") === "cancelled", "cancelled");
  assert(mapRazorpayStatus("created") === "free", "created");
});
