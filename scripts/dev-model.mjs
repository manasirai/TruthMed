// Starts the trained misinformation model (training/) on http://localhost:8000 for `npm run dev`.
// The model is optional: if it is not set up or it stops, this script says so and stays idle,
// because `concurrently -k` would otherwise shut down the backend and frontend with it.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const trainingDir = join(dirname(fileURLToPath(import.meta.url)), "..", "training");
const python =
  process.platform === "win32"
    ? join(trainingDir, ".venv", "Scripts", "python.exe")
    : join(trainingDir, ".venv", "bin", "python");

function stayIdle(message) {
  console.log(`${message}\nThe app keeps running without the model (fact checks will have no model_check).`);
  setInterval(() => {}, 1 << 30);
}

if (!existsSync(python)) {
  stayIdle("Model service skipped: training/.venv not found. Set it up as described in training/README.md.");
} else {
  const child = spawn(
    python,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    { cwd: trainingDir, stdio: "inherit", env: { ...process.env, HF_HUB_DISABLE_SYMLINKS_WARNING: "1" } },
  );
  const stop = () => child.kill();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("error", (err) => stayIdle(`Model service could not start: ${err.message}`));
  child.on("exit", (code) => stayIdle(`Model service stopped (exit code ${code}).`));
}
