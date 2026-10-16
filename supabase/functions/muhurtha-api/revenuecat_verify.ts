/** Server-side RevenueCat subscriber lookup — never trust client plan_code. */

export type VerifiedSubscription = {
  planCode: "free" | "plus" | "pro";
  productId: string | null;
  expirationAt: string | null;
};

function planFromEntitlements(
  ids: string[],
  productId?: string | null,
): "free" | "plus" | "pro" {
  const normalized = ids.map((id) => id.toLowerCase());
  if (
    normalized.includes("pro") ||
    normalized.includes("muhurta_pro") ||
    normalized.includes("muhurtha pro") ||
    normalized.includes("muhurtha_pro")
  ) {
    return "pro";
  }
  if (normalized.includes("plus") || normalized.includes("muhurta_plus")) {
    return "plus";
  }
  const product = (productId ?? "").toLowerCase();
  if (product.includes("pro")) return "pro";
  if (product.includes("plus")) return "plus";
  return "free";
}

function isEntitlementActive(expiresDate: string | null | undefined): boolean {
  if (expiresDate == null) return true;
  const ms = Date.parse(expiresDate);
  return Number.isFinite(ms) && ms > Date.now();
}

export async function verifyRevenueCatSubscription(
  appUserId: string,
): Promise<VerifiedSubscription | null> {
  const secret = Deno.env.get("REVENUECAT_API_V2_SECRET") ?? "";
  if (!secret) return null;

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) {
    console.warn(`RevenueCat verify failed: HTTP ${res.status}`);
    return null;
  }

  const data = await res.json() as {
    subscriber?: {
      entitlements?: Record<
        string,
        { expires_date?: string | null; product_identifier?: string | null }
      >;
      subscriptions?: Record<
        string,
        { expires_date?: string | null }
      >;
    };
  };

  const subscriber = data.subscriber;
  if (!subscriber) {
    return { planCode: "free", productId: null, expirationAt: null };
  }

  const activeEntitlementIds: string[] = [];
  let latestProductId: string | null = null;
  let latestExpiration: string | null = null;

  for (const [key, ent] of Object.entries(subscriber.entitlements ?? {})) {
    if (!isEntitlementActive(ent?.expires_date)) continue;
    activeEntitlementIds.push(key);
    if (ent?.product_identifier) latestProductId = ent.product_identifier;
    if (ent?.expires_date) latestExpiration = ent.expires_date;
  }

  if (activeEntitlementIds.length === 0) {
    for (const [productId, sub] of Object.entries(subscriber.subscriptions ?? {})) {
      if (!isEntitlementActive(sub?.expires_date)) continue;
      latestProductId = productId;
      if (sub?.expires_date) latestExpiration = sub.expires_date;
      break;
    }
  }

  const planCode = activeEntitlementIds.length > 0
    ? planFromEntitlements(activeEntitlementIds, latestProductId)
    : planFromEntitlements([], latestProductId);

  return {
    planCode,
    productId: latestProductId,
    expirationAt: latestExpiration,
  };
}
