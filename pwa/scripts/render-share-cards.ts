/** bun scripts/render-share-cards.ts <outDir> — renders every card type × locale × size. */
import fs from "node:fs";
import path from "node:path";
import { renderCard } from "../src/lib/share/render-card";
import { CARD_TYPES, sanitizeCardPayload, type CardLocale, type CardSize } from "../src/lib/share/card-types";
import { FIXTURES } from "../src/lib/share/fixtures";

const out = process.argv[2] ?? "share-cards";
fs.mkdirSync(out, { recursive: true });
const sizes: CardSize[] = (process.argv[3]?.split(",") as CardSize[]) ?? ["feed", "og"];
for (const locale of ["en", "te", "hi"] as CardLocale[]) {
  for (const type of CARD_TYPES) {
    const p = sanitizeCardPayload({ type, locale, data: FIXTURES[locale][type] });
    if (!p) throw new Error(`bad fixture ${locale}/${type}`);
    for (const size of sizes) {
      const t0 = Date.now();
      const png = await renderCard(p, size);
      const file = path.join(out, `${type}-${locale}-${size}.png`);
      fs.writeFileSync(file, png);
      console.log(file, png.length, `${Date.now() - t0}ms`);
    }
  }
}
