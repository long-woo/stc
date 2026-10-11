import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { once } from "node:events";
export const assertEquals = (
  actual: unknown,
  expected: unknown,
  message?: string,
) => assert.deepEqual(actual, expected, message);
export const assertStringIncludes = (actual: string, expected: string) =>
  assert.ok(
    actual.includes(expected),
    `Expected ${JSON.stringify(expected)} in ${actual}`,
  );
export const assertMatch = (actual: string, expected: RegExp) =>
  assert.match(actual, expected);
export const assertExists = (actual: unknown) =>
  assert.ok(actual !== null && actual !== undefined);
export const assertFalse = (actual: unknown) => assert.equal(actual, false);
export const assertThrows = (fn: () => unknown) => assert.throws(fn);
export const makeTempDir = (options: { prefix?: string } = {}) =>
  mkdtemp(join(tmpdir(), options.prefix ?? "stc_"));
export const readTextFile = (path: string) => readFile(path, "utf8");
export const writeTextFile = (path: string, text: string) =>
  writeFile(path, text, "utf8");
export { mkdir, rm as remove };
interface CommandOptions {
  args: string[];
  cwd?: string;
  stdout?: "piped" | "null";
  stderr?: "piped" | "null";
}
export class Command {
  constructor(
    private executable: string,
    private options: CommandOptions,
  ) {}
  spawn() {
    const child = spawn(this.executable, this.options.args, {
      cwd: this.options.cwd,
      env: { ...process.env, STC_SKIP_UPDATE_CHECK: "1" },
      stdio: [
        "ignore",
        this.options.stdout === "null" ? "ignore" : "pipe",
        this.options.stderr === "null" ? "ignore" : "pipe",
      ],
    });
    const stdout: Buffer[] = [],
      stderr: Buffer[] = [];
    child.stdout?.on("data", (chunk) => stdout.push(chunk));
    child.stderr?.on("data", (chunk) => stderr.push(chunk));
    const status = new Promise<{ code: number }>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) => resolve({ code: code ?? 1 }));
    });
    return {
      status,
      kill: (signal: NodeJS.Signals) => child.kill(signal),
      output: async () => ({
        ...(await status),
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      }),
    };
  }
  output() {
    return this.spawn().output();
  }
}
export type RunningCommand = ReturnType<Command["spawn"]>;
export async function serve(
  options: { port: number; hostname: string },
  handler: () => Response,
) {
  const server = createServer(async (_req, res) => {
    const response = handler();
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  });
  server.listen(options.port, options.hostname);
  await once(server, "listening");
  return {
    addr: server.address() as { port: number },
    shutdown: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
