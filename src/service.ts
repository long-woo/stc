import { Eta } from "x/eta@v3.4.0/src/index.ts";

const createFetchRuntimeFile = (platform = "axios") => {
  const eta = new Eta({ views: "./src/plugins/typescript/shared" });

  const _res = eta.render("./fetchRuntime", {
    platform,
  });

  // createFile(`${options.outDir}/shared/fetchRuntime.${options.lang}`, _res);
  return _res;
};

Deno.serve((_req: Request) => {
  const _url = new URL(_req.url);

  if (_url.pathname.includes("/api/")) {
    const _res = createFetchRuntimeFile();

    return new Response(_res);
  }

  return new Response("stc service is running!");
});
