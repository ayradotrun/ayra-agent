import { spawn } from "child_process";
import path from "path";
import { resolvePythonBin, resolvePythonPackageRoot } from "../src/lib/python/paths";

function runCommand(
  command: string,
  args: string[],
  extraEnv: Record<string, string> = {}
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const pythonBin = resolvePythonBin();
  const pkgRoot = resolvePythonPackageRoot();

  console.log(`[python:setup] Using ${pythonBin}`);
  console.log(`[python:setup] Installing editable package from ${pkgRoot}`);

  const versionCode = await runCommand(pythonBin, ["--version"]);
  if (versionCode !== 0) {
    console.error(
      "[python:setup] Python not found. Install Python 3.9+ and ensure it is on PATH, " +
        "or set AYRA_PYTHON_BIN in .env"
    );
    process.exit(1);
  }

  const pipCode = await runCommand(
    pythonBin,
    ["-m", "pip", "install", "-e", pkgRoot],
    { PYTHONPATH: pkgRoot }
  );
  if (pipCode !== 0) {
    process.exit(pipCode);
  }

  const verifyCode = await runCommand(pythonBin, [
    path.join(process.cwd(), "scripts", "verify-python-runtime.py"),
  ]);
  if (verifyCode !== 0) {
    process.exit(verifyCode);
  }

  console.log("[python:setup] Done — Python runtime is ready.");
}

main().catch((err) => {
  console.error("[python:setup] Failed:", err);
  process.exit(1);
});
