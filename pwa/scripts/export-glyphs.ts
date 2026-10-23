/** bun scripts/export-glyphs.ts — writes public/icons/glyphs/<name>.svg from src/lib/glyphs.ts. */
import fs from "node:fs";
import { GLYPHS } from "../src/lib/glyphs";

const dir = "public/icons/glyphs";
fs.mkdirSync(dir, { recursive: true });
for (const [name, d] of Object.entries(GLYPHS)) {
  fs.writeFileSync(
    `${dir}/${name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#77541F" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>\n`,
  );
}
console.log(`${Object.keys(GLYPHS).length} glyphs → ${dir}`);
