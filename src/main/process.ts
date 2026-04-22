import { spawn } from "node:child_process";

export interface ProcessOutput {
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number | null;
}

export function runProcess(
  executable: string,
  args: string[],
  options: { input?: Buffer; timeoutMs?: number } = {}
): Promise<ProcessOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: ["pipe", "pipe", "pipe"]
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;

    const timeout =
      options.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            if (settled) {
              return;
            }
            settled = true;
            child.kill("SIGKILL");
            reject(new Error(`Process timed out after ${options.timeoutMs}ms: ${executable}`));
          }, options.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      reject(error);
    });
    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve({
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        exitCode
      });
    });

    if (options.input) {
      child.stdin.end(options.input);
    } else {
      child.stdin.end();
    }
  });
}
