// One-off script: generates all PWA icon sizes from public/Zuri_Favicon.png
// Run with: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve("public/Zuri_Favicon.png");
const OUT_DIR = path.resolve("public/icons");

const SIZES = [72, 96, 128, 144, 192, 512];
// Maskable icons get ~20% padding safe-zone (10% each side) on a themed background.
const MASKABLE_SIZES = [192, 512];
const MASKABLE_BG = "#0C0C0E";

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const size of SIZES) {
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    await sharp(SRC).resize(size, size).png().toFile(outPath);
    console.log(`Wrote ${outPath}`);
  }

  for (const size of MASKABLE_SIZES) {
    const outPath = path.join(OUT_DIR, `icon-maskable-${size}.png`);
    const inner = Math.round(size * 0.8);
    const iconBuffer = await sharp(SRC).resize(inner, inner).png().toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: MASKABLE_BG,
      },
    })
      .composite([
        {
          input: iconBuffer,
          top: Math.round((size - inner) / 2),
          left: Math.round((size - inner) / 2),
        },
      ])
      .png()
      .toFile(outPath);
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
