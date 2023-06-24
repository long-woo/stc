import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import * as dnt from "x/dnt@0.37.0/mod.ts";
// import * as esbuild from "x/esbuild@v0.18.6/mod.js";
import pkg from "./package.json" assert { type: "json" };

// console.log(dirname(fromFileUrl(import.meta.url)));
// // join(dirname(fromFileUrl(import.meta.url)), "../cli.ts")

// const res = await esbuild.build({
//   entryPoints: ["./src/cli.ts"],
//   banner: {
//     js: `/*
// * stc v${pkg.version}
// * https://github.com/long-woo/stc
// *
// * Copyright ${new Date().getFullYear()} loong.woo
// * Released under the MIT license
// */`,
//   },
//   bundle: true,
//   outfile: "dist/index.js",
//   target: "es2015",
//   platform: "node",
// });
// console.log(res);
await dnt.build({
  entryPoints: ["./src/cli.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
  },
  typeCheck: false,
  test: false,
  importMap: "deno.json",
  package: pkg,
  postBuild() {
    Deno.copyFile("LICENSE", "./dist/LICENSE");
    Deno.copyFile("README.md", "./dist/README.md");
  },
});
