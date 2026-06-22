import sharp from "sharp";
import pngToIco from "png-to-ico";
import fs from "fs";
import path from "path";

const src = "public/ayra-logo.png";
const tmpDir = ".favicon-tmp";

async function main() {
  fs.mkdirSync(tmpDir, { recursive: true });

  const pngPaths = [];
  for (const size of [16, 32, 48]) {
    const out = path.join(tmpDir, `icon-${size}.png`);
    await sharp(src)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    pngPaths.push(out);
  }

  const ico = await pngToIco(pngPaths);
  fs.writeFileSync("public/favicon.ico", ico);
  fs.writeFileSync("src/app/favicon.ico", ico);

  await sharp(src)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile("src/app/icon.png");

  await sharp(src)
    .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile("src/app/apple-icon.png");

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("Favicon generated:", fs.statSync("public/favicon.ico").size, "bytes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
