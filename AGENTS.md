# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

STC (Swagger Transform Code) converts OpenAPI/Swagger/Apifox specs into type-safe client code. It supports TypeScript, JavaScript, Dart, and Swift output via a plugin system.

## Commands

```bash
# Requires Node.js 24+
npm ci
npm run dev                     # Watch source, generate from the local v3 fixture
npm run pack:resources          # Embed plugin resources
npm test                        # All tests
npm test -- test/cli.test.ts     # Single file
npm test -- -t "test name"       # Filter tests
npm run typecheck
npm run lint
npm run fmt                     # Format, excludes plugin shared/template assets
npm run fmt:check
npm run check                   # Typecheck, lint, formatting and tests
npm run build                   # ESM + declarations
npm run test:package            # Install and verify npm tarball
```

## Architecture

### Transformation Pipeline

`src/main.ts` (CLI entry) → `src/cli.ts` (arg parsing) → `src/app.ts` (`start()`) → plugin lifecycle events

The `start()` function in `app.ts`:

1. Fetches the OpenAPI spec (remote URL or local file, JSON or YAML — parsed via `parseSpec()` in `src/parser.ts`)
2. Calls `getDefinition()` from `core.ts` to parse type schemas (`definitions` for v2, `components.schemas` for v3)
3. Calls `getApiPath()` from `core.ts` to parse endpoint paths
4. Fires plugin lifecycle: `onLoad` → `onDefinition` → `onAction` → `onTransform` → `onEnd`
5. Writes generated files to `outDir` using diff-aware file writing

### Plugin System

Each language plugin lives in `src/plugins/<lang>/` and implements `IPlugin` from `src/plugins/typeDeclaration.ts`:

- `setup(context)` — returns `IPluginSetup` with `typeMap`, `template` filenames, and optional `langDirectoryName`/`templatePath`
- `onTransform(def, action, options)` — core method that produces `IPluginTransform` (definition file + action files map)

The `PluginManager` in `src/plugins/index.ts` registers plugins and wires their lifecycle methods onto the shared `IPluginContext`.

Templates use the **Eta** engine. Template files live in `src/plugins/<lang>/template/` and are excluded from lint/fmt.

### Shared Runtime Files

Each language plugin has a `shared/` directory (also excluded from lint/fmt) that gets copied to the output directory. These are the runtime helper files (HTTP client wrappers, type utilities) that the generated code depends on.

### Key Interfaces (`src/plugins/typeDeclaration.ts`)

- `IPlugin` — what a plugin must implement
- `IPluginContext` — passed through all lifecycle hooks; holds `options` + event handler refs
- `IPluginSetup` — returned by `setup()`; defines `typeMap` function and `template` paths
- `IPluginTransform` — returned by `onTransform()`; contains `definition` (single file) and `action` (Map of filename → content)
- `IPluginOptions` — `DefaultConfigOptions` merged with `Partial<IPluginSetup>`

### Virtual Property Types (`src/swagger.ts`)

`IDefinitionVirtualProperty` and `IPathVirtualProperty` are the normalized intermediate representations that `core.ts` produces from raw OpenAPI JSON. Plugins operate on these, not raw Swagger.

## Notes

- The `shared/` and `template/` directories inside plugins are intentionally excluded from Prettier and ESLint.
- A `.stc.lock` file is written to `outDir` after each run to cache the last-seen spec.
- The `noDeprecated` option (recently added) filters deprecated endpoints during `getApiPath()`.

- `package.json` is the single version source; Node.js 24 is the CI/build baseline.
- The npm package publishes ESM and declarations under `dist/`; Node 24 supports synchronous `require()` of this ESM library. Avoid top-level await in library exports.
- `deno.json` is retained as a historical configuration during platform validation; new tooling must not depend on it. JSR 2.x is frozen.
- Full migration validation is tracked in `docs/nodejs-migration-validation.md`. Do not claim unrun CI platforms or live publication are verified.
