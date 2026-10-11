/**
 * capture-demo.mjs — capture real screenshots of the running Client Growth
 * System web demo, for use as authentic product imagery on the landing page.
 *
 * Uses the live deployed demo. Navigates through the real app UI, waits for
 * content to settle, and writes PNG frames to public/product/.
 *
 * Run: node scripts/capture-demo.mjs
 */
import puppeteer from "puppeteer";
import { mkdir } from "node:fs/promises";

const BASE = "https://veyra.caelmont.in/demo/client-growth-system";
const OUT = "public/product";

// web-friendly resolution (displayed ~1000px wide in the hero)
const VIEWPORT = { width: 1280, height: 820, deviceScaleFactor: 1 };

const shots = [
  { file: "demo-journey.png", path: "", wait: 2600 },
  { file: "demo-sell.png", path: "/sell/opportunities", wait: 2600 },
  { file: "demo-acquire.png", path: "/acquire/prospects", wait: 2600 },
  { file: "demo-deliver.png", path: "/deliver/onboarding", wait: 2400 },
  { file: "demo-build.png", path: "/build/foundation", wait: 2400 },
  { file: "demo-dashboard.png", path: "/dashboard", wait: 2400 },
];

// Hide the web-demo chrome ("DEMO · BROWSE ONLY" badge, the "editing is off"
// banner) so screenshots read as the real product UI. This only removes the
// redundant web-demo watermark; the UI and seed data shown are genuine.
// Screenshots read as the real product UI by clipping off the top nav strip
// (where the web-demo "DEMO · BROWSE ONLY" badge lives). This is deterministic
// — no DOM manipulation — so the app's live re-renders can't undo it. The
// sidebar and all product content below the strip are preserved.
const CLIP = { x: 0, y: 62, width: 1280, height: 712 };

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  for (const shot of shots) {
    const url = BASE + shot.path;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await new Promise((r) => setTimeout(r, shot.wait));
      await page.screenshot({ path: `${OUT}/${shot.file}`, clip: CLIP });
      console.log("captured", shot.file);
    } catch (e) {
      console.log("FAILED", shot.file, String(e.message).split("\n")[0]);
    }
  }

  await browser.close();
  console.log("done");
}

main();
