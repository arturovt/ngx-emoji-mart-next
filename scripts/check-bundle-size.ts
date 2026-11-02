/**
 * This checks the main reason we split the emoji dataset. See emoji.service.ts. If you only
 * import `EmojiComponent`, it must not also pull in every category or the search keywords.
 *
 * We build a tiny entry file. It imports only `EmojiComponent` from the built library. We use
 * esbuild's `--splitting` mode here, the same way real apps use it (for example, Angular's own
 * build tool). Then we check the size of that one entry chunk. This is what someone pays for
 * just one emoji, before they even pick a category. If it grows past a budget, this script
 * fails.
 *
 * You must run `pnpm run build` first, so that `dist/` already exists.
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

// We measured about 36KB when we wrote this check (the index plus component code, with no
// category and no keywords). This budget leaves some room for the index to grow with the
// emoji dataset. It still catches a mistake that pulls in a whole category or the keywords
// file.
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
