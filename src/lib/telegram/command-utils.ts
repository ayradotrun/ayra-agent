/** Parse `/cmd args` — cmd is lowercased, bot suffix stripped */
export function parseSlashCommand(text: string): { cmd: string; args: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const body = trimmed.slice(1);
  const space = body.indexOf(" ");
  const cmd = (space === -1 ? body : body.slice(0, space)).toLowerCase().split("@")[0];
  const args = space === -1 ? "" : body.slice(space + 1).trim();
  return { cmd, args };
}

export function cmdIs(text: string, ...names: string[]): boolean {
  const parsed = parseSlashCommand(text);
  return parsed !== null && parsed.args === "" && names.includes(parsed.cmd);
}

export function cmdStarts(text: string, ...names: string[]): { args: string } | null {
  const parsed = parseSlashCommand(text);
  if (!parsed || !names.includes(parsed.cmd)) return null;
  return { args: parsed.args };
}
