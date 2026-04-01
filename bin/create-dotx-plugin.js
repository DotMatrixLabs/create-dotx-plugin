#!/usr/bin/env node
// Minimal-deps NPX scaffolder for Dot X plugins
// Usage: npx @dotmatrixlabs/create-dotx-plugin
//   Interactive TUI guides you through setup.
//   Flags (for CI / non-interactive): --name <n> --id <id> --deno|--node --force

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import * as p from '@clack/prompts';

const require = createRequire(import.meta.url);
const { dotxPluginSdkVersion: SDK_PACKAGE_VERSION } = require('../package.json');

// ── CLI arg parsing (still supported for CI) ─────────────────────────────────

function parseArgs(argv) {
  const args = { deno: undefined, node: undefined, force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--deno') args.deno = true, args.node = false;
    else if (a === '--node') args.node = true, args.deno = false;
    else if (a === '--force') args.force = true;
    else if (a === '--name') args.name = argv[++i];
    else if (a === '--id') args.id = argv[++i];
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else if (!args.name && !a.startsWith('--')) args.name = a;
  }
  return args;
}

function printHelp() {
  console.log(`
create-dotx-plugin — scaffold a new Dot X plugin

Usage:
  npx @dotmatrixlabs/create-dotx-plugin            (interactive)
  npx @dotmatrixlabs/create-dotx-plugin [options]   (non-interactive)

Options:
  --name <name>   Plugin display name
  --id   <id>     Plugin identifier (kebab-case)
  --node          Use Node + esbuild template
  --deno          Use Deno template (default)
  --force         Overwrite existing files
  -h, --help      Show this help
`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toId(name) {
  return (name || 'hello-world')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-\s_]/g, '')
    .replace(/[\s_]+/g, '-');
}

function writeFileSafe(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`File exists: ${path.basename(filePath)} (use --force to overwrite)`);
  }
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
}

// ── Interactive TUI ──────────────────────────────────────────────────────────

async function runInteractive(cliArgs) {
  p.intro('create-dotx-plugin');

  const project = await p.group(
    {
      name: () =>
        p.text({
          message: 'Plugin name',
          placeholder: 'Hello World Plugin',
          defaultValue: 'Hello World Plugin',
          validate: (v) => {
            if (!v.trim()) return 'Plugin name is required';
          },
        }),
      id: ({ results }) =>
        p.text({
          message: 'Plugin ID (kebab-case)',
          placeholder: toId(results.name),
          defaultValue: toId(results.name),
        }),
      runtime: () =>
        p.select({
          message: 'Choose a runtime',
          options: [
            { value: 'deno', label: 'Deno', hint: 'TypeScript, zero config, recommended' },
            { value: 'node', label: 'Node', hint: 'Node + esbuild, npm ecosystem' },
          ],
        }),
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.');
        process.exit(0);
      },
    }
  );

  const id = toId(project.id);
  const targetDir = path.join(process.cwd(), id);

  // Check if folder already exists
  if (fs.existsSync(targetDir) && !cliArgs.force) {
    const existing = fs.readdirSync(targetDir);
    if (existing.length > 0) {
      p.cancel(`Directory ${id} already exists and is not empty (use --force to overwrite)`);
      process.exit(1);
    }
  }

  return { name: project.name, id, runtime: project.runtime, targetDir, force: cliArgs.force };
}

// ── Templates ────────────────────────────────────────────────────────────────

function nodeReleaseWorkflow() {
  return `name: Release Plugin

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

permissions:
  contents: write
  id-token: write

jobs:
  build-release:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm install

      - name: Verify release version
        run: npm run release:verify-version
        env:
          RELEASE_TAG: \${{ github.ref_type == 'tag' && github.ref_name || '' }}

      - name: Build release package
        run: npm run package

      - name: Upload package artifact
        uses: actions/upload-artifact@v4
        with:
          name: plugin-package
          path: dist/plugin.zip
          if-no-files-found: error

      - name: Publish GitHub Release asset
        if: github.ref_type == 'tag'
        uses: softprops/action-gh-release@v2
        with:
          files: dist/plugin.zip
          fail_on_unmatched_files: true
          generate_release_notes: true
`;
}

function denoTemplates(meta) {
  const README = `# ${meta.name}\n\nA minimal plugin for Dot X. This template includes a Deno + TypeScript setup by default.\n\n## Prerequisites\n- Dot X application running (starts the local plugin server)\n- Deno 1.41+ (or Node 16+ if using the Node template)\n\n## Quick start (Deno)\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n deno task start\n\nThis runs \`main.ts\` with all permissions and connects to the Dot X plugin server.\n\n## Development workflow\n- Edit \`main.ts\` and save; restart the task to pick up changes\n- Watch logs in the Dot X app and in \`plugin.log\` (created next to your files)\n- Implement your plugin logic inside the \`onLoad()\` method\n\n### Common tasks\n- Start: \`deno task start\`\n- Lint (optional): \`deno lint\`\n- Format (optional): \`deno fmt\`\n\n## Optional: Node + esbuild\nIf you prefer Node, install deps and build:\n\n\n\n\n\n\n\n\n\n\n\n\n\n npm install\n npm run build\n npm start\n\nRecommended when you scaffolded with the \`--node\` flag.\n\n## File structure\n\n\n\n\n\n\n\n\n\n\n manifest.json   # Plugin metadata (id, name, entry file)\n main.ts         # Plugin entrypoint (uses runPlugin from the SDK)\n deno.json       # Deno task (start)\n .gitignore      # Useful ignores (node_modules, plugin.log)\n README.md       # This file\n\n## Troubleshooting\n- Ensure the Dot X app is running before starting the plugin\n- If connection fails, the SDK will retry and print detailed hints\n- Check firewall/antivirus if timeouts persist\n\n## Learn more\n- Getting Started: <DOCS_BASE_URL>/plugin-sdk/getting-started/first-plugin\n- Examples: <DOCS_BASE_URL>/plugin-sdk/examples\n- Manifest reference: <DOCS_BASE_URL>/plugin-sdk/manifest\n- SDK Reference: <DOCS_BASE_URL>/plugin-sdk/sdk-reference\n`;

  return {
    'manifest.json': JSON.stringify({
      id: meta.id,
      name: meta.name,
      version: '0.1.0',
      description: 'A minimal Dot X plugin',
      author: '',
      dotxVersion: '>=1.0.0',
      permissions: [],
      main: 'main.ts'
    }, null, 2) + '\n',
    'main.ts': `import Plugin, { runPlugin } from "npm:@dotmatrixlabs/dotx-plugin-sdk";

class HelloWorld extends Plugin {
  async onLoad() {
    await this.ui.showToast({ message: "Hello from plugin!", type: "success" });
  }
}

runPlugin(HelloWorld);
`,
    'deno.json': JSON.stringify({ tasks: { start: 'deno run --allow-all main.ts' }, nodeModulesDir: 'auto' }, null, 2) + '\n',
    '.gitignore': `node_modules\nplugin.log\n.DS_Store\n`,
    'README.md': README
  };
}

function nodeTemplates(meta) {
  const pkg = {
    name: meta.id,
    version: '0.1.0',
    private: true,
    type: 'commonjs',
    scripts: {
      build: 'node -e "const manifest=require(\\"./manifest.json\\"); require(\\"esbuild\\").build({ entryPoints: [\\"main.ts\\"], outfile: manifest.main, bundle: true, format: \\"cjs\\", platform: \\"node\\", target: \\"node16\\", minify: true }).catch((error) => { console.error(error.message); process.exit(1); })"',
      package: 'npm run build && dotx-plugin package',
      'release:verify-version': 'dotx-plugin verify-release',
      'release:build': 'npm run release:verify-version && npm run package',
      start: 'node -e "const { spawn } = require(\\"node:child_process\\"); const manifest=require(\\"./manifest.json\\"); const child=spawn(process.execPath,[manifest.main],{stdio:\\"inherit\\"}); child.on(\\"exit\\",(code)=>process.exit(code ?? 0)); child.on(\\"error\\",(error)=>{ console.error(error.message); process.exit(1); })"'
    },
    dependencies: {
      '@dotmatrixlabs/dotx-plugin-sdk': SDK_PACKAGE_VERSION
    },
    devDependencies: {
      'esbuild': '^0.25.6'
    }
  };

  const README = `# ${meta.name}

A minimal plugin for Dot X (Node + esbuild).

## Package Overview

This project uses one direct npm dependency:

- \`@dotmatrixlabs/dotx-plugin-sdk\` for the runtime SDK and the \`dotx-plugin\` packaging CLI

## Quick start (Node)

\`\`\`bash
npm install
npm run build
npm start
\`\`\`

Ensure the Dot X app is running before starting the plugin.

## Marketplace Packaging

\`\`\`bash
npm run package
\`\`\`

This creates \`dist/plugin.zip\` with:

- \`manifest.json\`
- the file declared by \`manifest.main\`
- optional \`assets/\`, \`data/\`, and \`bin/\`
- any extra paths listed in \`manifest.json\` under \`packaging.include\`

Example:

\`\`\`json
{
  "packaging": {
    "include": ["locales", "templates/email.html"]
  }
}
\`\`\`

## GitHub Releases

This template includes a GitHub Actions workflow at \`.github/workflows/release-plugin.yml\`.

Push a version tag such as \`v0.1.0\` and GitHub Actions will:

- verify the tag matches \`package.json\` and \`manifest.json\`
- validate marketplace-required manifest fields
- build the file referenced by \`manifest.main\`
- create \`dist/plugin.zip\`
- upload \`plugin.zip\` to the GitHub Release

Recommended release flow:

1. update \`manifest.json\` and \`package.json\` to the release version
2. commit and push your changes
3. push a tag such as \`v0.1.0\`
4. let GitHub Actions build and attach \`dist/plugin.zip\` to the release

See Deno alternative in docs if preferred.
`;

  return {
    'manifest.json': JSON.stringify({
      id: meta.id,
      name: meta.name,
      version: '0.1.0',
      description: 'A minimal Dot X plugin',
      author: '',
      dotxVersion: '>=1.0.0',
      permissions: [],
      main: 'main.js'
    }, null, 2) + '\n',
    'main.ts': `import Plugin, { runPlugin } from '@dotmatrixlabs/dotx-plugin-sdk';

class HelloWorld extends Plugin {
  async onLoad() {
    await this.ui.showToast({ message: 'Hello from plugin!', type: 'success' });
  }
}

runPlugin(HelloWorld);
`,
    'package.json': JSON.stringify(pkg, null, 2) + '\n',
    '.gitignore': `dist/\nnode_modules\nplugin.log\nvendor/\n.DS_Store\n`,
    'README.md': README,
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        strict: true,
        esModuleInterop: true
      }
    }, null, 2) + '\n',
    '.github/workflows/release-plugin.yml': nodeReleaseWorkflow()
  };
}

// ── Scaffold ─────────────────────────────────────────────────────────────────

function scaffold({ name, id, runtime, targetDir, force }) {
  const useNode = runtime === 'node';
  const template = useNode ? nodeTemplates({ id, name }) : denoTemplates({ id, name });

  try {
    Object.entries(template).forEach(([file, content]) => {
      writeFileSafe(path.join(targetDir, file), content, force);
    });
  } catch (err) {
    p.cancel(err.message);
    process.exit(1);
  }

  const folderName = path.basename(targetDir);
  if (useNode) {
    p.note(
      `cd ${folderName}\nnpm install\nnpm start`,
      'Next steps'
    );
  } else {
    p.note(
      `cd ${folderName}\ndeno task start`,
      'Next steps'
    );
  }

  p.outro(`Scaffolded Dot X plugin in ${folderName}/`);
}

// ── Skill prompt ─────────────────────────────────────────────────────────────

async function promptInstallSkill() {
  const install = await p.confirm({
    message: 'Install the dot-x-plugin-dev AI skill? (gives your AI assistant full Plugin SDK knowledge)',
    initialValue: false,
  });

  if (p.isCancel(install) || !install) return;

  p.note(
    'npx skills add DotMatrixLabs/create-dotx-plugin/dot-x-plugin-dev',
    'Run this command to install'
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // If enough args provided, run non-interactively (backwards compat / CI)
  const hasExplicitArgs = args.name || args.id || args.node === true || args.deno === true;

  if (hasExplicitArgs) {
    const name = args.name || 'Hello World Plugin';
    const id = toId(args.id || name);
    const runtime = args.node ? 'node' : 'deno';
    const targetDir = path.join(process.cwd(), id);
    scaffold({ name, id, runtime, targetDir, force: args.force });
  } else {
    // Interactive TUI
    const options = await runInteractive(args);
    scaffold(options);
    await promptInstallSkill();
  }
}

main();
