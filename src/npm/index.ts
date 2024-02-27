import * as dnt from "x/dnt@0.40.0/mod.ts";
// import * as esbuild from "x/esbuild@v0.18.6/mod.js";
import pkg from "./package.json" with { type: "json" };

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

const OUTDIR = "npm_dist";

await dnt.emptyDir(`./${OUTDIR}`);

await dnt.build({
  entryPoints: [{
    kind: "bin",
    name: "stc",
    path: "./src/main.ts",
  }, "./mod.ts"],
  outDir: `./${OUTDIR}`,
  shims: {
    deno: true,
  },
  typeCheck: false,
  test: false,
  scriptModule: false,
  importMap: "./import_map.json",
  package: pkg,
  postBuild() {
    Deno.copyFile("LICENSE", `./${OUTDIR}/LICENSE`);
    Deno.copyFile("README.md", `./${OUTDIR}/README.md`);
  },
});
