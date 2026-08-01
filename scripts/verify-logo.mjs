// Verifies the generated NOVRIX brand assets: dimensions, transparency, and
// stroke color. Run with: node scripts/verify-logo.mjs

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '..', 'public');

const TARGET_RED = { r: 0xc2, g: 0x34, b: 0x4d }; // #C2344D
const COLOR_TOLERANCE = 6;

let failures = 0;

function report(label, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${label}${detail ? `: ${detail}` : ''}`);
  if (!pass) failures++;
}

async function checkDimensions(file, expectedWidth, expectedHeight) {
  const p = path.join(PUBLIC, file);
  const meta = await sharp(p).metadata();
  const pass = meta.width === expectedWidth && meta.height === expectedHeight;
  report(
    `${file} is ${expectedWidth}x${expectedHeight}`,
    pass,
    `got ${meta.width}x${meta.height}`
  );
  return meta;
}

async function pixelAt(file, x, y) {
  const p = path.join(PUBLIC, file);
  const { data, info } = await sharp(p)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const idx = (y * info.width + x) * info.channels;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: data[idx + 3],
  };
}

function colorClose(px, target, tolerance) {
  return (
    Math.abs(px.r - target.r) <= tolerance &&
    Math.abs(px.g - target.g) <= tolerance &&
    Math.abs(px.b - target.b) <= tolerance
  );
}

async function main() {
  // Dimensions
  await checkDimensions('logo.png', 512, 512);
  await checkDimensions('apple-touch-icon.png', 180, 180);
  await checkDimensions('android-chrome-192x192.png', 192, 192);
  await checkDimensions('android-chrome-512x512.png', 512, 512);
  await checkDimensions('og-image.png', 1200, 630);

  // logo.png: transparent background at (0,0)
  const logoBg = await pixelAt('logo.png', 0, 0);
  report('logo.png background is transparent (alpha=0 at 0,0)', logoBg.a === 0, `alpha=${logoBg.a}`);

  // logo.png: stroke color at a known stroke-center pixel is ~#C2344D
  const logoStroke = await pixelAt('logo.png', 180, 256);
  report(
    'logo.png stroke color at center pixel ≈ #C2344D',
    colorClose(logoStroke, TARGET_RED, COLOR_TOLERANCE) && logoStroke.a === 255,
    `rgb(${logoStroke.r},${logoStroke.g},${logoStroke.b}) alpha=${logoStroke.a}`
  );

  // logo.png: an edge pixel should show partial alpha, not a hard 0/255 cutoff
  const edge = await pixelAt('logo.png', 224, 256);
  report(
    'logo.png stroke edge has partial alpha (anti-aliasing preserved)',
    edge.a > 0 && edge.a < 255,
    `alpha=${edge.a}`
  );

  // apple-touch-icon.png: solid opaque background at (0,0)
  const appleBg = await pixelAt('apple-touch-icon.png', 0, 0);
  report(
    'apple-touch-icon.png background is solid (alpha=255 at 0,0)',
    appleBg.a === 255,
    `alpha=${appleBg.a}, rgb(${appleBg.r},${appleBg.g},${appleBg.b})`
  );

  // favicon.ico exists and is non-empty
  const fs = await import('node:fs/promises');
  const icoStat = await fs.stat(path.join(PUBLIC, 'favicon.ico'));
  report('favicon.ico exists and is non-empty', icoStat.size > 0, `${icoStat.size} bytes`);

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
