import * as dnt from "x/dnt@0.37.0/mod.ts";
// import * as esbuild from "x/esbuild@v0.18.6/mod.js";
import pkg from "./package.json" assert { type: "json" };

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
  outDir: "./npm_dist",
  shims: {
    deno: true,
  },
  typeCheck: false,
  test: false,
  importMap: "deno.json",
  package: pkg,
  postBuild() {
    Deno.copyFile("LICENSE", "./npm_dist/LICENSE");
    Deno.copyFile("README.md", "./npm_dist/README.md");
  },
});
