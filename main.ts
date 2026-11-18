// Token Radar's entry: one command turns the sealed snapshot into the submission.
//
//   node main.ts [snapshot.json] [out/]
//
// The snapshot defaults to the kit's sealed input; the output defaults to out/.
// Nothing here reads the network, calls an API or writes outside the output
// directory, so the submission's board is reproducible from the same snapshot.
//
// What it writes:
//   out/board.json         the ranked board, the gate's own file
//   out/data.js            the dashboard's dataset, as one script
//   out/dashboard/         the dashboard's files, copied from dashboard/
//   out/screenshots/       the submission's screenshots, copied from screenshots/
//   out/dossier.json       the dossier, rebuilt from out/ with the vendored
//                          make.fun library, which the judge compares bytes with
// It fails on any of: the snapshot's shape, the board's gate, a missing
// screenshot, or the dossier's limits.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const KIT = join(HERE, 'kit', 'token-radar-01-kit');
const SNAPSHOT = join(KIT, 'input', 'snapshot.json');

/** The dossier's own caps (reference/gate.json): the text cap shapes the bytes, the rest refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const DASHBOARD_CAPS = { max_files: 400, max_bytes: 4_194_304 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** A positional argument, or the fallback. */
function arg(index: number, fallback: string): string {
  return process.argv[index] !== undefined ? process.argv[index]! : fallback;
}

function bytes(n: number): string {
  return n >= 1_048_576 ? `${(n / 1_048_576).toFixed(2)} MiB` : `${Math.round(n / 1024)} KiB`;
}

/** The command's usage, printed with a failing exit. */
function fail(message: string): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.stderr.write('usage: node main.ts [snapshot.json] [out/]\n');
  process.exit(2);
}

/** Copy one directory's regular files into `to`, skipping names that start with a dot. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

const inputFile = arg(2, SNAPSHOT);
if (!existsSync(inputFile)) fail(`no snapshot at ${inputFile}: pass a snapshot.json`);
const out = arg(3, join(HERE, 'out'));

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) fail(`the model wrote a board the gate refuses: ${issue}`);

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

copyFiles(join(HERE, 'dashboard'), join(out, 'dashboard'));
const shots = copyFiles(join(HERE, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) fail(`screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view`);
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) fail(`screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
}

// The dossier is written last: the scorer rebuilds it from this out/ and compares bytes.
const dossier = buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SCREENSHOT_CAPS, dashboard: DASHBOARD_CAPS });
writeFileSync(join(out, 'dossier.json'), dossier);

const boardBytes = statSync(join(out, 'board.json')).size;
const dataBytes = statSync(join(out, 'data.js')).size;
const top = board[0]!;
process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
    `token radar: wrote ${join(out, 'board.json')} (${board.length} rows, ${bytes(boardBytes)}), ${join(out, 'data.js')} (${bytes(dataBytes)}), ${join(out, 'dashboard')} and ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')} (${bytes(dossier.length)})\n` +
    `token radar: top ${top.name} ($${top.implied_value_usd.toLocaleString('en-US')}), global peer multiple ${radar.global_multiple}, model ${radar.model_version}\n` +
    `token radar: dashboard: open ${join(out, 'dashboard', 'index.html')}\n`,
);
