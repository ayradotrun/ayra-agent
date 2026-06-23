import sharp from "sharp";

const WIDTH = 1500;
const HEIGHT = 500;
const OUT = "docs/assets/ayra-readme-banner.png";
const ART_SRC =
  process.argv[2] ||
  "C:/Users/PC/.cursor/projects/d-ayra-agent/assets/ayra-banner-character-only.png";
const LOGO_SRC = "public/ayra-logo.png";

async function main() {
  const art = await sharp(ART_SRC).resize({ height: HEIGHT }).png().toBuffer();
  const artMeta = await sharp(art).metadata();
  const padRight = Math.max(0, WIDTH - artMeta.width);

  const canvas = padRight
    ? await sharp(art)
        .extend({
          right: padRight,
          background: { r: 4, g: 14, b: 10, alpha: 1 },
        })
        .png()
        .toBuffer()
    : await sharp(art)
        .resize(WIDTH, HEIGHT, { fit: "cover", position: "left" })
        .png()
        .toBuffer();

  const logo = await sharp(LOGO_SRC).resize(100, 100).png().toBuffer();

  const textX = Math.max(760, artMeta.width - 40);
  const textOverlay = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f3d24" stroke-width="1" opacity="0.5"/>
    </pattern>
    <linearGradient id="fade" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#041510" stop-opacity="0"/>
      <stop offset="18%" stop-color="#041510" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#041510" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect x="${textX - 60}" y="0" width="${WIDTH - textX + 60}" height="${HEIGHT}" fill="url(#grid)" opacity="0.45"/>
  <rect x="${textX - 60}" y="0" width="${WIDTH - textX + 60}" height="${HEIGHT}" fill="url(#fade)"/>
  <style>
    .title { font: 700 68px Arial, Helvetica, sans-serif; fill: #ffffff; }
    .title-accent { font: 700 68px Arial, Helvetica, sans-serif; fill: #7dffb0; }
    .tagline { font: 400 26px Arial, Helvetica, sans-serif; fill: #d7fbe6; }
    .traits { font: 500 22px Arial, Helvetica, sans-serif; fill: #8ef0b3; letter-spacing: 2px; }
  </style>
  <line x1="${textX}" y1="290" x2="${WIDTH - 80}" y2="290" stroke="#3ecf7a" stroke-width="2" opacity="0.85"/>
  <circle cx="${Math.round((textX + WIDTH - 80) / 2)}" cy="290" r="5" fill="#7dffb0"/>
  <text x="${textX + 120}" y="165">
    <tspan class="title">AYRA</tspan><tspan dx="14" class="title-accent">Agent</tspan>
  </text>
  <text x="${textX + 120}" y="245" class="tagline">Autonomous AI agents for Solana developers</text>
  <text x="${textX + 120}" y="350" class="traits">Calm · Smart · Determined</text>
</svg>`);

  await sharp(canvas)
    .composite([
      { input: logo, left: textX, top: 48 },
      { input: textOverlay, left: 0, top: 0 },
    ])
    .png()
    .toFile(OUT);

  const outMeta = await sharp(OUT).metadata();
  console.log(`Wrote ${OUT} at ${outMeta.width}x${outMeta.height}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
