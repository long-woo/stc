# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STC (Swagger Transform Code) converts OpenAPI/Swagger/Apifox specs into type-safe client code. It supports TypeScript, JavaScript, Dart, and Swift output via a plugin system.

## Commands

```bash
# Development
deno task dev          # Watch mode with petstore demo (TS → JS)
deno task pack         # Prepare package before dev

# Testing
deno test -A                                          # All tests
deno test -A test/cli.test.ts                         # Single file
deno test -A --filter "test name" test/cli.test.ts    # Single test by name

# Code quality
deno fmt               # Format (applies to src/ and test/, excludes shared/ and template/)
deno lint              # Lint

# Build
deno task build:npm    # Build NPM package via dnt
deno task build:mac    # Compile binary for Intel Mac
deno task build:mac-m  # Compile binary for Apple Silicon Mac
deno task build:win    # Compile binary for Windows
deno task build:linux  # Compile binary for Linux
```

## Architecture

### Transformation Pipeline

`src/main.ts` (CLI entry) → `src/cli.ts` (arg parsing) → `src/app.ts` (`start()`) → plugin lifecycle events

The `start()` function in `app.ts`:
1. Fetches the OpenAPI JSON (remote URL or local file)
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

- The `shared/` and `template/` directories inside plugins are intentionally excluded from `deno fmt` and `deno lint`.
- `src/service.ts` is an HTTP service wrapper (`deno task serve`) — separate from the CLI pipeline.
- A `.stc.lock` file is written to `outDir` after each run to cache the last-seen spec.
- The `noDeprecated` option (recently added) filters deprecated endpoints during `getApiPath()`.
