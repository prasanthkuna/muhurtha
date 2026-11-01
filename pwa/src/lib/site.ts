/** The app's one public address, and the old addresses that now forward to it. */
export const CANONICAL_HOST = "muhurtha-app.vercel.app";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

/** Old production hosts. Browser visits 308 to the new address; the installed app on these
 *  hosts keeps working and shows a one-time "new home" sheet instead (PWAs are tied to their
 *  origin, so storage, sessions and push do not carry across). */
export const LEGACY_HOSTS = new Set(["pwa-lyart-phi.vercel.app", "pwa-prasanthkunas-projects.vercel.app"]);

/** Set by the client when the page runs as an installed app (display-mode: standalone). */
export const APP_MODE_COOKIE = "muh_app";

export function isLegacyHost(host: string | null | undefined): boolean {
  return !!host && LEGACY_HOSTS.has(host.toLowerCase().split(":")[0]);
}
