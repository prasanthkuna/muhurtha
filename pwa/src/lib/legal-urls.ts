/** Legal pages are served by the PWA itself (public, no sign-in). */
export const LegalUrls = {
  privacy: "/privacy",
  terms: "/terms",
  deleteAccount: "/delete-account",
  home: "/",
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
