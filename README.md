# Token Radar — a radar for pre-token protocols

A submission for the [make.fun token launch radar bounty](https://make.fun/bounty/token-radar-01)
(deadline 2026-12-14 10:00 UTC). It reads one sealed DefiLlama snapshot, finds the
protocols that still have no token, ranks them by implied post-launch value, and
shows a dashboard with a leaderboard, a detail view and a farm plan for each.

## What it is

- **The board** — 178 pre-token protocols: the 40 on the snapshot's watchlist
  (TVL at or above the $50,000,000 floor) plus 138 early rows below the floor,
  ranked by implied value. Live-token protocols are kept apart in the Live token
  view and shown with the market's own values.
- **The model (`radar-2`)** — implied value = TVL × peer multiple × growth ×
  maturity × reach. The peer multiple is the median market-cap / TVL of the
  tokenized protocols in the same category in this snapshot (at least 3 peers,
  else the market-wide median, clamped to [0.05, 1.5]). Growth is the clamped
  7-day change; maturity is how long the protocol has run with no token; reach
  is how many chains its TVL already sits on. One function scores every row —
  no protocol name is ever special-cased, and each detail view shows its own
  arithmetic. The page recomputes each row and says whether it matches
  `board.json`.
- **The farm plan** — six steps per protocol (fresh wallet, the category's
  action, a weekly action, a hold window, claim safety, a farm log), each with
  a cost and a time. No step promises an airdrop; the dashboard says so
  wherever the plan is shown.
- **The dashboard** — a static page (HTML/CSS/JS, no framework, no network,
  no fetch): search, category and chain filters, a Watchlist/Early scope
  toggle, five sorts, a Live token view, and a detail view per protocol with
  hash routing (`#p=<slug>`, `#category=…`).

## Build

Node 22.18 or later, standard library only.

```sh
node main.ts [snapshot.json] [out/]
```

The snapshot defaults to the competition kit's sealed input; the output
defaults to `out/`. It writes `out/board.json` (178 rows), `out/data.js`
(the dashboard's dataset), `out/dashboard/`, `out/screenshots/` and
`out/dossier.json` (rebuilt from `out/` with the vendored make.fun library).
It fails on a bad snapshot, a board the gate refuses, a missing screenshot,
or a dossier over its limits.

Screenshots (1280×800, JPEG) are taken with the script in `scripts/`:

```sh
node scripts/shoot.mjs
```

## Top of the board (snapshot 2026-11-14)

| # | Protocol | Category | TVL | Implied value |
|---|----------|----------|-----|---------------|
| 1 | Steakhouse Financial | Risk Curators | $2.75B | $511,417,128 |
| 2 | Gauntlet | Risk Curators | $1.58B | $304,587,637 |
| 3 | Veda | Onchain Capital Allocator | $1.56B | $292,838,688 |
| 4 | USDD | CDP | $1.06B | $159,021,873 |
| 5 | Upshift | Onchain Capital Allocator | $499M | $105,060,531 |
| 6 | Bittensor dTAO | Dexs | $376M | $77,272,598 |
| 7 | Nonce Capital | Risk Curators | $514M | $67,638,866 |
| 8 | OnRe | RWA | $309M | $66,090,736 |
| 9 | OpenTrade | RWA | $242M | $62,161,804 |
| 10 | Plume Vaults | RWA | $212M | $54,997,140 |

Cross-checked against a fresh DefiLlama fetch (2026-11-18): all 178 board
rows are still pre-token.

## Honesty

Implied value is a model's estimate, not a price and not a promise. Only the
snapshot's own figures are used — nothing is invented. Farming costs real gas
and carries smart-contract risk; no airdrop is guaranteed.

## Layout

- `main.ts` — the entry: snapshot in, submission out.
- `lib/model.ts` — the model, the board, the farm plans, the snapshot's shape.
- `vendor/makefun-board.ts` — the vendored make.fun dossier library (as shipped).
- `dashboard/` — the static page: `index.html`, `app.css`, `app.js`.
- `screenshots/` — the three submission screenshots: board, detail, filtered.
- `scripts/` — the screenshot and verification scripts (build tools, not the entry).
- `out/` — the generated submission (board.json, data.js, dashboard, screenshots, dossier.json).

## License

MIT — see `LICENSE`.
