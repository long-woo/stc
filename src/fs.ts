import { access, cp, mkdir, open, readdir, rm } from "node:fs/promises";
import { dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import glob from "fast-glob";

export interface ExpandGlobOptions {
  exclude?: string[];
}
export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (
      ["ENOENT", "ENOTDIR"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    )
      return false;
    throw error;
  }
}
export async function ensureFile(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const file = await open(path, "a");
  await file.close();
}
export async function emptyDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
  await Promise.all(
    (await readdir(path)).map((name) =>
      rm(resolve(path, name), { recursive: true, force: true }),
    ),
  );
}
export const copy = (
  from: string,
  to: string,
  options: { overwrite?: boolean } = {},
) => cp(from, to, { recursive: true, force: options.overwrite ?? true });
export async function* expandGlob(
  pattern: string | URL,
  options: ExpandGlobOptions = {},
) {
  const paths = await glob(
    (pattern instanceof URL ? fileURLToPath(pattern) : pattern).replaceAll(
      "\\",
      "/",
    ),
    {
      absolute: true,
      onlyFiles: true,
      dot: true,
      ignore: options.exclude?.map((p) => p.replaceAll("\\", "/")),
    },
  );
  for (const path of paths.sort())
    yield { path: path.replaceAll("\\", "/"), name: basename(path) };
}
