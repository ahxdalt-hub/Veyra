// Regenerate src/lib/admin/sound-asset.ts from scripts/assets/sale-chime.mp3.
//
// The chime ships as a data URI baked into the client bundle (see
// sound-asset.ts for why). Shopify chimes (and most stock "ka-ching"
// files) end in several seconds of encoded digital silence — dead
// weight in the bundle and a laggy-feeling cue — so trailing repeated
// silent frames are trimmed before embedding (a couple are kept so the
// decoder's natural decay isn't clipped).
//
// Usage: node scripts/embed-sale-chime.mjs
import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("./assets/sale-chime.mp3", import.meta.url);
const OUT = new URL("../src/lib/admin/sound-asset.ts", import.meta.url);

const buf = readFileSync(SRC);

// Find a repeated identical suffix block (an mp3 "silence frame" run).
// Works from the largest plausible frame size down; keeps up to 2 reps.
let cut = buf.length;
for (let size = 600; size >= 200; size--) {
  const last = buf.subarray(buf.length - size);
  const prev = buf.subarray(buf.length - 2 * size, buf.length - size);
  if (!last.equals(prev)) continue;
  let start = buf.length - size;
  while (
    start - 2 * size >= 0 &&
    buf.subarray(start - size, start).equals(last)
  ) {
    start -= size;
  }
  const reps = (buf.length - start) / size;
  cut = start + Math.min(reps, 2) * size;
  break;
}

const trimmed = buf.subarray(0, cut);
const b64 = trimmed.toString("base64");

writeFileSync(
  OUT,
  `/**
 * Sale chime — embedded audio, generated from scripts/assets/
 * sale-chime.mp3 (Shopify-style register) by scripts/embed-sale-chime.mjs.
 * Data URI keeps the chime off the public file tree: no static-serving
 * dependency, nothing publicly downloadable, and it bundles with the
 * admin client. Trailing silent frames are trimmed at embed time.
 * Regenerate: node scripts/embed-sale-chime.mjs
 */
export const SALE_CHIME_SRC =
  "data:audio/mpeg;base64,${b64}";
`
);

console.log(
  `embedded ${(trimmed.length / 1024).toFixed(1)} KiB ` +
    `(trimmed ${(buf.length - cut) / 1024} KiB of trailing silence)`
);
