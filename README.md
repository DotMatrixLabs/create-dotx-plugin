# @dotmatrixlabs/create-dotx-plugin

Scaffold a Dot X plugin project.

## Usage

Run without any arguments to start the interactive guided setup:

```bash
npx @dotmatrixlabs/create-dotx-plugin
```

The TUI will walk you through choosing a plugin name, ID, runtime (Deno or Node), whether to include the GitHub release workflow, and whether to scaffold into the current directory or a new folder based on the plugin ID.

### CLI flags (for CI / automation)

Flags can be passed directly to skip the interactive prompts:

```bash
npx @dotmatrixlabs/create-dotx-plugin --name "My Plugin" --node
```

- `--name <name>`: Plugin display name
- `--id <id>`: Override the generated plugin ID (kebab-case)
- `--deno` (default): Deno + TypeScript template
- `--node`: Node + TypeScript + esbuild template with `plugin.zip` packaging
- `--no-release-workflow`: Skip `.github/workflows/release-plugin.yml` in the generated project
- `--here`: Scaffold into the current directory instead of creating a new folder
- `--force`: Overwrite existing files

## Generated Projects

Both runtimes include an optional GitHub Actions release workflow by default:

- `.github/workflows/release-plugin.yml`

Node templates depend on `@dotmatrixlabs/dotx-plugin-sdk` from npm and include:

- `npm run build`
- `npm run package`
- manifest-driven packaging via `manifest.json -> packaging.include`
- no special local SDK path wiring; the generated project consumes the published `@dotmatrixlabs/dotx-plugin-sdk` package directly

Deno templates import `@dotmatrixlabs/dotx-plugin-sdk` through Deno's `npm:` support and include:

- `deno task start`
- `deno task package`

The shared release workflow auto-detects whether the project uses Deno or Node.

## Typical Node Workflow

```bash
npx @dotmatrixlabs/create-dotx-plugin --name "My Plugin" --node
cd my-plugin
npm install
npm start
```

To scaffold directly into the current directory:

```bash
npx @dotmatrixlabs/create-dotx-plugin --name "My Plugin" --node --here
npm install
npm start
```

To create a marketplace package:

```bash
npm run package
```

## Typical Deno Workflow

```bash
npx @dotmatrixlabs/create-dotx-plugin --name "My Plugin"
cd my-plugin
deno task start
```

To create a marketplace package:

```bash
deno task package
```

## AI Skill

This repo includes a [dot-x-plugin-dev](./dot-x-plugin-dev/) agent skill that gives AI coding assistants (Claude Code, Cursor, Windsurf, etc.) deep knowledge of the Plugin SDK.

The scaffolder will offer to install it at the end of the setup flow. Or install it manually:

```bash
npx skills add DotMatrixLabs/create-dotx-plugin/dot-x-plugin-dev
```
