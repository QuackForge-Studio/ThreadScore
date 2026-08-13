// Builds web/functions/ into a stable Worker bundle that vitest-pool-workers can
// load as `poolOptions.workers.main` (see vitest.integration.config.ts). Kept as a
// plain CommonJS helper (no ESM transpile needed) and run from web/.
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = process.cwd();
const functionsDir = path.join(root, 'functions');
const outDir = path.join(root, '.wrangler', 'functions-build');
const finalFile = path.join(root, '.wrangler', 'functions-build', 'worker.js');
const cli = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`wrangler exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

async function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  await run(['pages', 'functions', 'build', functionsDir, '--outdir', outDir]);
  // `--outdir` emits an `index.js`; copy it to a stable name so config doesn't
  // need to track the generated filename.
  const built = path.join(outDir, 'index.js');
  if (!fs.existsSync(built)) {
    throw new Error(`Expected build output not found: ${built}`);
  }
  fs.copyFileSync(built, finalFile);
  console.log(`Built Pages Functions -> ${finalFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
