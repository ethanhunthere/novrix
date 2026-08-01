// Regenerates all NOVRIX brand/logo assets from the source file
// novrixlogokryesore.png (grey background, white trinity-knot strokes).
//
// Run with: node scripts/generate-logo-assets.mjs

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'novrixlogokryesore.png');
const PUBLIC = path.join(ROOT, 'public');

const RED = { r: 0xc2, g: 0x34, b: 0x4d }; // #C2344D
const WHITE = { r: 255, g: 255, b: 255 };
const BG = { r: 0x0a, g: 0x0a, b: 0x0f }; // #0A0A0F

// Tight bounding box of the trinity-knot strokes, found via connected-component
// analysis of the source at a luminance threshold above the background's grain
// floor (~70) and below the strokes' near-white fill (~240). A 10px pad on each
// side preserves the anti-aliased halo around the shape. This deliberately
// excludes two stray decorative artifacts baked into the source canvas — a dim
// sparkle glyph (~x1264-1311,y624-671) and a small dark square (~x39,y577) —
// neither of which belongs to the logo strokes.
const CROP = { left: 457, top: 133, width: 493, height: 500 };

// Luminance-to-alpha ramp. Background grain tops out ~69; stroke fill starts
// ~240. Anything in between is genuine anti-aliasing on the stroke edges, so a
// linear ramp across that exact range reproduces the original edge softness
// as an alpha gradient instead of a hard cutoff.
const ALPHA_BLACK = 70;
const ALPHA_WHITE = 255;

const LANCZOS3 = sharp.kernel.lanczos3;

async function buildRecoloredMask(color) {
  const { data, info } = await sharp(SOURCE)
    .extract(CROP)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let alpha = ((lum - ALPHA_BLACK) / (ALPHA_WHITE - ALPHA_BLACK)) * 255;
    alpha = Math.max(0, Math.min(255, Math.round(alpha)));

    out[p] = color.r;
    out[p + 1] = color.g;
    out[p + 2] = color.b;
    out[p + 3] = alpha;
  }

  return sharp(out, { raw: { width, height, channels: 4 } });
}

// Scales the cropped glyph to fit within a `pad`-sized margin of a
// `canvas`x`canvas` transparent square and composites it centered, so every
// derived square asset shares the same visual proportions as logo.png.
async function centeredOnTransparentSquare(maskSharp, canvas, marginRatio = 0.2) {
  const inner = Math.round(canvas * (1 - marginRatio));
  const resizedBuffer = await maskSharp
    .resize(inner, inner, { fit: 'inside', kernel: LANCZOS3 })
    .png()
    .toBuffer();
  const meta = await sharp(resizedBuffer).metadata();

  return sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resizedBuffer,
        left: Math.round((canvas - meta.width) / 2),
        top: Math.round((canvas - meta.height) / 2),
      },
    ])
    .png({ compressionLevel: 9 });
}

async function main() {
  await fs.mkdir(PUBLIC, { recursive: true });

  // ---- Step 1: recolored logo, 512x512, transparent background ----
  const redMask = await buildRecoloredMask(RED);
  const redSquare = await centeredOnTransparentSquare(redMask, 512);
  const logoPath = path.join(PUBLIC, 'logo.png');
  await redSquare.toFile(logoPath);
  console.log('wrote', logoPath);

  const whiteMask = await buildRecoloredMask(WHITE);
  const whiteSquare = await centeredOnTransparentSquare(whiteMask, 512);
  const whiteLogoBuffer = await whiteSquare.png({ compressionLevel: 9 }).toBuffer();

  // ---- Step 2: favicon set, all derived from public/logo.png ----
  const favicon32 = await sharp(logoPath)
    .resize(32, 32, { kernel: LANCZOS3 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const favicon16 = await sharp(logoPath)
    .resize(16, 16, { kernel: LANCZOS3 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const icoBuffer = await pngToIco([favicon16, favicon32]);
  await fs.writeFile(path.join(PUBLIC, 'favicon.ico'), icoBuffer);
  console.log('wrote favicon.ico');

  // Apple touch icon: white logo on solid #0A0A0F, no transparency, 20px pad.
  const appleCanvas = 180;
  const applePad = 20;
  const appleInner = appleCanvas - applePad * 2; // 140
  const appleLogoBuffer = await sharp(whiteLogoBuffer)
    .resize(appleInner, appleInner, { fit: 'inside', kernel: LANCZOS3 })
    .png()
    .toBuffer();
  const appleLogoMeta = await sharp(appleLogoBuffer).metadata();
  await sharp({
    create: {
      width: appleCanvas,
      height: appleCanvas,
      channels: 4,
      background: { ...BG, alpha: 1 },
    },
  })
    .composite([
      {
        input: appleLogoBuffer,
        left: Math.round((appleCanvas - appleLogoMeta.width) / 2),
        top: Math.round((appleCanvas - appleLogoMeta.height) / 2),
      },
    ])
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'apple-touch-icon.png'));
  console.log('wrote apple-touch-icon.png');

  // Android chrome icons: red logo, transparent background.
  await sharp(logoPath)
    .resize(192, 192, { kernel: LANCZOS3 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'android-chrome-192x192.png'));
  console.log('wrote android-chrome-192x192.png');

  await fs.copyFile(logoPath, path.join(PUBLIC, 'android-chrome-512x512.png'));
  console.log('wrote android-chrome-512x512.png');

  // Social avatar: red logo on solid #0A0A0F, 1024x1024, generous margin.
  // Instagram/Twitter/Facebook/Telegram all crop profile photos to a circle,
  // which clips anything near the corners of a square upload. The inscribed
  // circle of a square only guarantees safety for content within ~70.7% of
  // the canvas width (inner ≤ canvas / sqrt(2)); a 66%-fill (34% margin)
  // logo stays comfortably inside that circle on every platform.
  const socialCanvas = 1024;
  const socialMarginRatio = 0.34;
  const socialInner = Math.round(socialCanvas * (1 - socialMarginRatio));
  const socialLogoBuffer = await sharp(logoPath)
    .resize(socialInner, socialInner, { fit: 'inside', kernel: LANCZOS3 })
    .png()
    .toBuffer();
  const socialLogoMeta = await sharp(socialLogoBuffer).metadata();
  await sharp({
    create: {
      width: socialCanvas,
      height: socialCanvas,
      channels: 4,
      background: { ...BG, alpha: 1 },
    },
  })
    .composite([
      {
        input: socialLogoBuffer,
        left: Math.round((socialCanvas - socialLogoMeta.width) / 2),
        top: Math.round((socialCanvas - socialLogoMeta.height) / 2),
      },
    ])
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'logo-social.png'));
  console.log('wrote logo-social.png');

  // ---- Step 3: Open Graph image, 1200x630 ----
  // Logo only, no wordmark — sized to the canvas height (minus breathing room)
  // and centered both axes.
  const ogWidth = 1200;
  const ogHeight = 630;
  const ogLogoSize = Math.round(ogHeight * 0.56);
  const ogLogoBuffer = await sharp(whiteLogoBuffer)
    .resize(ogLogoSize, ogLogoSize, { kernel: LANCZOS3 })
    .png()
    .toBuffer();

  const ogLogoLeft = Math.round((ogWidth - ogLogoSize) / 2);
  const ogLogoTop = Math.round((ogHeight - ogLogoSize) / 2);

  await sharp({
    create: {
      width: ogWidth,
      height: ogHeight,
      channels: 4,
      background: { ...BG, alpha: 1 },
    },
  })
    .composite([{ input: ogLogoBuffer, left: ogLogoLeft, top: ogLogoTop }])
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'og-image.png'));
  console.log('wrote og-image.png');

  console.log('\nAll brand assets generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
