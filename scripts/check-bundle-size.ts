/**
 * Guards the whole point of splitting the emoji dataset (see emoji.service.ts): importing only
 * `EmojiComponent` must not pull in every category or the search keywords. Bundles a tiny entry
 * that imports just `EmojiComponent` from the built library, the same way esbuild's own
 * `--splitting` mode is used by real consumers (Angular's own application builder included), and
 * fails if the entry chunk — what a single-emoji consumer pays before even picking a category —
 * grows past a budget.
 *
 * Requires `pnpm run build` to have already produced `dist/`.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = path.join(__dirname, '../dist');
const ENTRY_POINT = path.join(DIST, 'fesm2022/ngx-emoji-mart-next-ngx-emoji.mjs');

if (!fs.existsSync(ENTRY_POINT)) {
  console.error(`${ENTRY_POINT} doesn't exist. Run \`pnpm run build\` first.`);
  process.exit(1);
}

// Measured ~36KB when this check was written (index + component code, no category, no
// keywords). Leaves headroom for the index to grow with the emoji dataset itself, while still
// catching a regression that drags in a whole category or the keywords file by mistake.
const BUDGET_BYTES = 60 * 1024;

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngx-emoji-bundle-check-'));
const entryFile = path.join(workDir, 'entry.mjs');
const outDir = path.join(workDir, 'out');

fs.writeFileSync(entryFile, `export { EmojiComponent } from '${ENTRY_POINT}';\n`);

execSync(
  [
    'pnpm exec esbuild',
    entryFile,
    '--bundle',
    '--format=esm',
    '--minify',
    '--splitting',
    `--outdir=${outDir}`,
    '--external:@angular/core',
    '--external:@angular/common',
    '--external:@angular/platform-browser',
    '--external:rxjs',
  ].join(' '),
  { stdio: 'inherit' },
);

const entryOutput = path.join(outDir, 'entry.js');
const gzipSize = gzipSync(fs.readFileSync(entryOutput)).length;

fs.rmSync(workDir, { recursive: true, force: true });

console.log(`EmojiComponent-only entry chunk: ${gzipSize} bytes gzipped (budget: ${BUDGET_BYTES})`);

if (gzipSize > BUDGET_BYTES) {
  console.error(
    `FAIL: over budget. This likely means something EmojiComponent depends on now pulls in ` +
      `data (every category, or search keywords) that a single-emoji consumer shouldn't pay for.`,
  );
  process.exit(1);
}
