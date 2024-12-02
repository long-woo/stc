import { assertEquals } from "@std/assert";

Deno.test("version", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--version",
    ],
  });
  const { code } = await command.output();

  // console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});

Deno.test("help", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--help",
    ],
  });
  const { code } = await command.output();

  // console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});

Deno.test("filter", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=https://petstore3.swagger.io/api/v3/openapi.json",
      "--filter=/user*",
      "-f=!/user/createWithList",
    ],
  });
  const { code, stdout } = await command.output();

  console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});

Deno.test("conjunction", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=https://api.swaggerhub.com/apis/frezs/wp-json/1.0.0",
      "-c=with",
    ],
  });
  const { code } = await command.output();

  assertEquals(0, code);
});

Deno.test("actionIndex", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=./test/action-index.json",
      "--actionIndex=-2",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});
