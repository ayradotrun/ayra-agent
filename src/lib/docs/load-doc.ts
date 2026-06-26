import fs from "fs";
import path from "path";

export function loadDocMarkdown(fileBase: string): string | null {
  const filePath = path.join(process.cwd(), "docs", `${fileBase}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}
