import * as dnt from "x/dnt@0.40.0/mod.ts";
import pkg from "./pkg.json" with { type: "json" };

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
