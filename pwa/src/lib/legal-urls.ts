const siteBase =
  process.env.NEXT_PUBLIC_LEGAL_SITE_URL ?? "https://muhurta-legal.vercel.app";

export const LegalUrls = {
  privacy: `${siteBase}/privacy`,
  terms: `${siteBase}/terms`,
  deleteAccount: `${siteBase}/delete-account`,
  home: siteBase,
  supportEmail: "prasanthkuna@gmail.com",
};

export function accountDeletionMailto(phoneHint?: string) {
  const body = [
    "Please delete my Muhūrta account and associated data.",
    "",
    `Phone on account: ${phoneHint ?? "(your number)"}`,
    `Requested on: ${new Date().toISOString()}`,
  ].join("\n");
  return `mailto:${LegalUrls.supportEmail}?subject=${encodeURIComponent("Muhūrta account deletion request")}&body=${encodeURIComponent(body)}`;
}
