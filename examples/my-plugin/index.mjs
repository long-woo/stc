import { start } from "@lonu/stc";
import { buildEta } from "@lonu/stc/plugin/common";

// The template files are illustrative pseudocode. This example writes a JSON
// catalog to demonstrate asynchronous setup and the public plugin lifecycle.
/** @type {import('@lonu/stc/plugin/types').IPlugin} */
const myPlugin = {
  name: "stc:myPlugin",
  lang: "catalog",
  async setup() {
    return { template: await buildEta("./template") };
  },
  onTransform(definitions, actions) {
    return {
      definition: {
        filename: "catalog.json",
        banner: false,
        content: JSON.stringify({ definitions: [...definitions.keys()], actions: [...actions.keys()] }, null, 2),
      },
      action: new Map(),
    };
  },
};

await start({
  lang: "catalog",
  outDir: "./dist",
  url: "../../test/openapi-v3.yaml",
  clean: true,
  plugins: [myPlugin],
});
