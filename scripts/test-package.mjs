import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const version = JSON.parse(await readFile("package.json", "utf8")).version;
const dir = await mkdtemp(join(tmpdir(), "stc-package-test-"));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this check with npm run test:package");
const env = {
  ...process.env,
  STC_SKIP_UPDATE_CHECK: "1",
  npm_config_cache: process.env.STC_NPM_CACHE ?? join(dir, ".npm-cache"),
};
try {
  const tarball =
    process.env.STC_TARBALL ??
    JSON.parse(
      execFileSync(
        process.execPath,
        [npmCli, "pack", "--json", "--ignore-scripts"],
        {
          encoding: "utf8",
          env,
        },
      ),
    )[0].filename;
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  execFileSync(
    process.execPath,
    [
      npmCli,
      "install",
      resolve(tarball),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      ...(process.env.STC_NPM_CACHE
        ? ["--cache", process.env.STC_NPM_CACHE, "--offline"]
        : []),
    ],
    { cwd: dir, stdio: "inherit", env },
  );
  const cli = join(dir, "node_modules/@lonu/stc/dist/src/main.js");
  const run = (args) =>
    execFileSync(process.execPath, [cli, ...args], {
      cwd: dir,
      env,
      encoding: "utf8",
    });
  assert.ok(run(["--version"]).includes(`stc v${version}`));
  for (const lang of ["ts", "js", "dart", "swift", "mcp"]) {
    run([
      "--url",
      join(root, "test/openapi-v3.yaml"),
      "--outDir",
      `out-${lang}`,
      "--lang",
      lang,
      "--client",
      "axios",
    ]);
    assert.ok(await readFile(join(dir, `out-${lang}/.stc.lock`), "utf8"));
  }
  await cp(join(root, "test/openapi-v3.yaml"), join(dir, "openapi.yaml"));
  await writeFile(
    join(dir, "settings.ts"),
    'enum Language { TS = "ts" }; export const language = Language.TS;',
  );
  await writeFile(
    join(dir, "stc.config.ts"),
    'import { defineConfig } from "@lonu/stc"; import { language } from "./settings.ts"; export default defineConfig({ url: "./openapi.yaml", outDir: "./from-config", lang: language, shared: false });',
  );
  run([]);
  assert.ok(await readFile(join(dir, "from-config/_types.ts"), "utf8"));
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      'import {start,defineConfig} from "@lonu/stc"; import {parserDefinition} from "@lonu/stc/plugin/definition"; import {parserActions} from "@lonu/stc/plugin/action"; import {setupTemplate} from "@lonu/stc/plugin/common"; if([start,defineConfig,parserDefinition,parserActions,setupTemplate].some(v=>typeof v!=="function")) throw Error("exports");',
    ],
    { cwd: dir, env },
  );
  execFileSync(
    process.execPath,
    [
      "-e",
      'if(typeof require("@lonu/stc").start!=="function") throw Error("require");',
    ],
    { cwd: dir, env },
  );
  await cp(join(root, "examples/my-plugin/template"), join(dir, "template"), {
    recursive: true,
  });
  await writeFile(
    join(dir, "plugin.mjs"),
    `
import assert from 'node:assert/strict';
import { start } from '@lonu/stc';
import { buildEta } from '@lonu/stc/plugin/common';
import { readFile, writeFile } from 'node:fs/promises';
const events = [];
await start({url:'./openapi.yaml',outDir:'custom-output',lang:'custom',clean:true,shared:false,plugins:[{
 name:'custom',lang:'custom',async setup() { events.push('setup'); return {template:await buildEta('./template')}; },
 onLoad() {events.push('load');}, onDefinition() {events.push('definition');}, onAction() {events.push('action');},
 onTransform(def, actions) {events.push('transform'); return {definition:{filename:'catalog.json',banner:false,content:JSON.stringify({definitions:def.size,actions:actions.size})}};},
 async onEnd() {events.push('end');await writeFile('custom-output/end.txt','done');}
}]});
assert.deepEqual(events,['setup','load','definition','action','transform','end']);
assert.equal(await readFile('custom-output/end.txt','utf8'),'done');
assert.ok(JSON.parse(await readFile('custom-output/catalog.json','utf8')).actions > 0);
`,
  );
  execFileSync(process.execPath, ["plugin.mjs"], {
    cwd: dir,
    stdio: "inherit",
    env,
  });
  // Compile consumer imports using the repository compiler, resolving the installed declarations.
  await writeFile(
    join(dir, "consumer.ts"),
    'import { defineConfig } from "@lonu/stc"; import type { IPlugin } from "@lonu/stc/plugin/types"; const config = defineConfig({lang:"ts"}); const plugin: Partial<IPlugin> = {name:"custom"}; console.log(config, plugin);',
  );
  execFileSync(
    process.execPath,
    [
      join(root, "node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--skipLibCheck",
      "--module",
      "NodeNext",
      "--target",
      "ES2024",
      join(dir, "consumer.ts"),
    ],
    { cwd: dir, stdio: "inherit", env },
  );
  console.log(
    "Installed package: five plugins, TS config imports, ESM/CJS exports and declarations passed.",
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
