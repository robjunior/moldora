import { spawn } from "child_process";

export interface ExecOptions {
  cwd?: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  durationMs: number;
}

export async function execFileSafe(
  command: string,
  args: string[],
  options: ExecOptions
): Promise<ExecResult> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let finished = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (exitCode, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode,
        signal,
        timedOut,
        durationMs: Date.now() - start,
      });
    });
  });
}
