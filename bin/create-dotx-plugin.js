#!/usr/bin/env node
// Minimal-deps NPX scaffolder for Dot X plugins
// Usage: npx @dotmatrixlabs/create-dotx-plugin
//   Interactive TUI guides you through setup.
//   Flags (for CI / non-interactive): --name <n> --id <id> --deno|--node --no-release-workflow --force

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import * as p from '@clack/prompts';

const require = createRequire(import.meta.url);
const { dotxPluginSdkVersion: SDK_PACKAGE_VERSION } = require('../package.json');

// ── CLI arg parsing (still supported for CI) ─────────────────────────────────

function parseArgs(argv) {
  const args = {
    deno: undefined,
    node: undefined,
    force: false,
    here: false,
    includeReleaseWorkflow: undefined
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--deno') args.deno = true, args.node = false;
    else if (a === '--node') args.node = true, args.deno = false;
    else if (a === '--no-release-workflow') args.includeReleaseWorkflow = false;
    else if (a === '--force') args.force = true;
    else if (a === '--here' || a === '--current-dir') args.here = true;
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
  --no-release-workflow  Skip the GitHub release workflow in the generated project
  --here          Scaffold into the current directory
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

function spawnNpx(args, options = {}) {
  if (process.platform === 'win32') {
    return spawnSync(`npx ${args.join(' ')}`, { ...options, shell: true });
  }

  return spawnSync('npx', args, options);
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
      includeReleaseWorkflow: () =>
        p.confirm({
          message: 'Include the GitHub Actions release workflow?',
          initialValue: cliArgs.includeReleaseWorkflow ?? true,
        }),
      location: () =>
        p.select({
          message: 'Where should the plugin be created?',
          options: [
            { value: 'new-folder', label: 'New folder', hint: 'Create a folder based on the plugin ID' },
            { value: 'current-dir', label: 'Current directory', hint: 'Write the scaffold into this folder' },
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
  const useCurrentDir = project.location === 'current-dir';
  const targetDir = useCurrentDir ? process.cwd() : path.join(process.cwd(), id);

  // Check if the generated folder already exists and is non-empty.
  if (!useCurrentDir && fs.existsSync(targetDir) && !cliArgs.force) {
    const existing = fs.readdirSync(targetDir);
    if (existing.length > 0) {
      p.cancel(`Directory ${id} already exists and is not empty (use --force to overwrite)`);
      process.exit(1);
    }
  }

  return {
    name: project.name,
    id,
    runtime: project.runtime,
    targetDir,
    force: cliArgs.force,
    installInCurrentDir: useCurrentDir,
    includeReleaseWorkflow: project.includeReleaseWorkflow,
  };
}

// ── Templates ────────────────────────────────────────────────────────────────

function releaseWorkflow() {
  return fs.readFileSync(new URL('../actions/.github/workflows/release-plugin.yml', import.meta.url), 'utf8');
}

function denoTemplates(meta, { includeReleaseWorkflow = true } = {}) {
  const releaseSection = includeReleaseWorkflow ? `

## GitHub Releases

This template includes a GitHub Actions workflow at \`.github/workflows/release-plugin.yml\`.

Push a version tag such as \`v0.1.0\`, or run the workflow manually and provide the version, and GitHub Actions will:

- resolve the release version from the tag or workflow input
- validate marketplace-required manifest fields
- create \`dist/plugin.zip\`
- upload \`plugin.zip\` to the GitHub Release
` : '';

  const README = `# ${meta.name}

A minimal plugin for Dot X. This template includes a Deno + TypeScript setup by default.

## Prerequisites
- Dot X application running (starts the local plugin server)
- Deno 1.41+ (or Node 16+ if using the Node template)

## Quick start (Deno)

\`\`\`bash
deno task start
\`\`\`

This runs \`main.ts\` with all permissions and connects to the Dot X plugin server.

## Development workflow
- Edit \`main.ts\` and save; restart the task to pick up changes
- Watch logs in the Dot X app and in \`plugin.log\` (created next to your files)
- Implement your plugin logic inside the \`onLoad()\` method

### Common tasks
- Start: \`deno task start\`
- Package: \`deno task package\`
- Lint (optional): \`deno lint\`
- Format (optional): \`deno fmt\`

## Marketplace Packaging

\`\`\`bash
deno task package
\`\`\`

This creates \`dist/plugin.zip\` with \`manifest.json\` and the file declared by \`manifest.main\`, plus any extra paths listed in \`manifest.json\` under \`packaging.include\`.

${releaseSection}

## File structure

\`\`\`
manifest.json   # Plugin metadata (id, name, entry file)
main.ts         # Plugin entrypoint (uses runPlugin from the SDK)
deno.json       # Deno tasks (start, package)
.gitignore      # Useful ignores (node_modules, plugin.log)
README.md       # This file
\`\`\`

## Troubleshooting
- Ensure the Dot X app is running before starting the plugin
- If connection fails, the SDK will retry and print detailed hints
- Check firewall/antivirus if timeouts persist

## Learn more
- [Getting Started](https://docs.dotmatrixlabs.com/plugin-sdk/getting-started/first-plugin)
- [Examples](https://docs.dotmatrixlabs.com/plugin-sdk/examples)
- [Manifest reference](https://docs.dotmatrixlabs.com/plugin-sdk/manifest)
- [SDK Reference](https://docs.dotmatrixlabs.com/plugin-sdk/sdk-reference)
`;

  const files = {
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
    'deno.json': JSON.stringify({ tasks: { start: 'deno run --allow-all main.ts', package: 'npx @dotmatrixlabs/dotx-plugin-sdk package' }, nodeModulesDir: 'auto' }, null, 2) + '\n',
    '.gitignore': `node_modules\nplugin.log\n.DS_Store\n`,
    'README.md': README
  };

  if (includeReleaseWorkflow) {
    files['.github/workflows/release-plugin.yml'] = releaseWorkflow();
  }

  return files;
}

function nodeTemplates(meta, { includeReleaseWorkflow = true } = {}) {
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

  const releaseSection = includeReleaseWorkflow ? `

## GitHub Releases

This template includes a GitHub Actions workflow at \`.github/workflows/release-plugin.yml\`.

Push a version tag such as \`v0.1.0\`, or run the workflow manually and provide the version, and GitHub Actions will:

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
` : '';

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

${releaseSection}
See Deno alternative in docs if preferred.
`;

  const files = {
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
    }, null, 2) + '\n'
  };

  if (includeReleaseWorkflow) {
    files['.github/workflows/release-plugin.yml'] = releaseWorkflow();
  }

  return files;
}

// ── Scaffold ─────────────────────────────────────────────────────────────────

function scaffold({ name, id, runtime, targetDir, force, installInCurrentDir = false, includeReleaseWorkflow = true }) {
  const useNode = runtime === 'node';
  const template = useNode
    ? nodeTemplates({ id, name }, { includeReleaseWorkflow })
    : denoTemplates({ id, name }, { includeReleaseWorkflow });

  try {
    Object.entries(template).forEach(([file, content]) => {
      writeFileSafe(path.join(targetDir, file), content, force);
    });
  } catch (err) {
    p.cancel(err.message);
    process.exit(1);
  }

  if (useNode) {
    p.note(
      installInCurrentDir ? 'npm install\nnpm start' : `cd ${path.basename(targetDir)}\nnpm install\nnpm start`,
      'Next steps'
    );
  } else {
    p.note(
      installInCurrentDir ? 'deno task start' : `cd ${path.basename(targetDir)}\ndeno task start`,
      'Next steps'
    );
  }

  p.outro(
    installInCurrentDir
      ? `Scaffolded Dot X plugin in ${targetDir}`
      : `Scaffolded Dot X plugin in ${path.basename(targetDir)}/`
  );
}

// ── Skill prompt ─────────────────────────────────────────────────────────────

async function promptInstallSkill() {
  const install = await p.confirm({
    message: 'Install the dot-x-plugin-dev AI skill? (gives your AI assistant full Plugin SDK knowledge)',
    initialValue: false,
  });

  if (p.isCancel(install) || !install) return;

  const result = spawnNpx(['skills', 'add', 'DotMatrixLabs/create-dotx-plugin/dot-x-plugin-dev'], { stdio: 'inherit' });

  if (result.error) {
    p.log.error(`Skill installation failed: ${result.error.message}`);
    return;
  }

  if (result.status !== 0) {
    p.log.error(`Skill installation failed${typeof result.status === 'number' ? ` (exit code ${result.status})` : ''}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // If enough args provided, run non-interactively (backwards compat / CI)
  const hasExplicitArgs = args.name || args.id || args.node === true || args.deno === true || args.here;

  if (hasExplicitArgs) {
    const name = args.name || 'Hello World Plugin';
    const id = toId(args.id || name);
    const runtime = args.node ? 'node' : 'deno';
    const targetDir = args.here ? process.cwd() : path.join(process.cwd(), id);
    scaffold({
      name,
      id,
      runtime,
      targetDir,
      force: args.force,
      installInCurrentDir: args.here,
      includeReleaseWorkflow: args.includeReleaseWorkflow ?? true
    });
  } else {
    // Interactive TUI
    const options = await runInteractive(args);
    scaffold(options);
    await promptInstallSkill();
  }
}

main();
