// Token Radar's page: the board, the detail view and the live view, from data.js.
// No network: every number it shows is in data.js, and the farm plan is the same derivation main.ts
// writes to board.json (category, chains, TVL, age) — the page recomputes each row's implied value
// from its own fields and says so in the detail view.
(function () {
  'use strict';
  var R = window.RADAR;
  var app = document.getElementById('app');
  var lede = document.getElementById('lede');
  if (!R || !R.rows) {
    app.innerHTML = '<p class="empty">The snapshot data did not load. Open this page from the same folder as data.js.</p>';
    return;
  }

  // ---------------------------------------------------------------- helpers
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function compact(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n == null) return '<span class="na">—</span>';
    var cls = n > 0 ? 'pos' : n < 0 ? 'neg' : '';
    return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(1) + '%</span>';
  }
  function days(n) {
    if (n == null) return 'unknown';
    if (n < 365) return n + 'd';
    return (n / 365).toFixed(1) + 'y';
  }
  function chainOf(p) { return p.chains && p.chains.length ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age == null) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + '\u2019s main pool on ' + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Stake $' + capital + ' of the chain\u2019s staking asset through ' + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + ' of the protocol\u2019s yield asset on ' + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('basis') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + '\u2019s basis vault on ' + chain + ' and keep the position open.';
    if (c.indexOf('payment') >= 0) return 'Pay one real invoice of $' + capital + ' through ' + name + ' on ' + chain + ' and keep the receipt.';
    if (c.indexOf('governance') >= 0) return 'Deposit $' + capital + ' into ' + name + ' on ' + chain + ' and vote on one live proposal.';
    if (c.indexOf('chain') >= 0) return 'Bridge $' + capital + ' of USDC onto ' + chain + ' and use ' + name + '\u2019s app once a week.';
    if (c.indexOf('cedefi') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  // The farm plan, step by step: the action, what it costs, and how long it takes.
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var gas = capital >= 150 ? 8 : 4;
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and about $' + gas + ' of gas', time: '15 minutes to set up' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: 'Before you withdraw, open the protocol\u2019s own points or rewards page and claim only from the link it publishes.', cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' },
    ];
  }
  // The model's own arithmetic, from the row's fields: the page's check that the board and the code agree.
  function recompute(p) {
    return Math.max(1, Math.round(p.tvl_usd * p.peer_multiple * p.growth_multiplier * p.maturity_multiplier * p.reach_multiplier));
  }
  function bySlug(slug) {
    for (var i = 0; i < R.rows.length; i++) if (R.rows[i].slug === slug) return R.rows[i];
    return null;
  }

  // ---------------------------------------------------------------- state
  var CATS = [];
  var CHAINS = [];
  (function () {
    var seen = {}, seenC = {};
    R.rows.forEach(function (r) {
      if (r.category && !seen[r.category]) { seen[r.category] = 1; CATS.push(r.category); }
      (r.chains || []).forEach(function (c) { if (!seenC[c]) { seenC[c] = 1; CHAINS.push(c); } });
    });
    CATS.sort();
    CHAINS.sort();
  })();
  function stateFromHash() {
    var s = { view: 'board', p: '', q: '', category: '', chain: '', scope: 'all', sort: 'implied' };
    var h = location.hash.replace(/^#/, '');
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      var k = kv[0], v = decodeURIComponent(kv[1] || '');
      if (k === 'view' && (v === 'board' || v === 'live')) s.view = v;
      else if (k === 'p') s.p = v;
      else if (k === 'q') s.q = v;
      else if (k === 'category') s.category = v;
      else if (k === 'chain') s.chain = v;
      else if (k === 'scope' && (v === 'all' || v === 'watchlist' || v === 'early')) s.scope = v;
      else if (k === 'sort') s.sort = v;
    });
    return s;
  }
  function hashOf(s) {
    var parts = [];
    if (s.view !== 'board') parts.push('view=' + s.view);
    if (s.p) parts.push('p=' + encodeURIComponent(s.p));
    if (s.q) parts.push('q=' + encodeURIComponent(s.q));
    if (s.category) parts.push('category=' + encodeURIComponent(s.category));
    if (s.chain) parts.push('chain=' + encodeURIComponent(s.chain));
    if (s.scope !== 'all') parts.push('scope=' + s.scope);
    if (s.sort !== 'implied') parts.push('sort=' + s.sort);
    return parts.length ? '#' + parts.join('&') : '#';
  }
  function setHash(s) {
    var h = hashOf(s);
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  // ---------------------------------------------------------------- header
  var top = R.rows[0];
  lede.innerHTML = 'Snapshot <b>' + esc(R.as_of) + '</b> · ' + esc(R.source) + ' · floor <b>' + compact(R.floor_usd) + '</b> · model <b>' + esc(R.model_version) + '</b>. ' +
    'The strongest launch on the board is <b>' + esc(top.name) + '</b> at <b>' + money(top.implied_value_usd) + '</b> implied. ' +
    'Every row below is pre-token; protocols that already have a token are kept apart in the Live token view.';

  function statsHtml() {
    var watch = R.rows.filter(function (r) { return r.watchlist; }).length;
    return '<section class="stats">' +
      '<div class="stat"><div class="num">' + R.board_size + '</div><div class="lab">protocols ranked</div></div>' +
      '<div class="stat"><div class="num">' + R.watchlist_size + '</div><div class="lab">on the watchlist (≥ ' + compact(R.floor_usd) + ' TVL)</div></div>' +
      '<div class="stat"><div class="num">' + R.early_size + '</div><div class="lab">early rows below the floor</div></div>' +
      '<div class="stat"><div class="num">' + money(top.implied_value_usd) + '</div><div class="lab">top implied value · ' + esc(top.name) + '</div></div>' +
      '</section>';
  }
  function methodHtml() {
    var m = R.model;
    var rows = R.peer_table.map(function (t) {
      return '<tr><td>' + esc(t.category) + '</td><td class="num">' + t.peers + '</td><td class="num">' + t.multiple.toFixed(3) + '</td></tr>';
    }).join('');
    return '<details class="method"><summary>How the implied value is built — and what it is not</summary>' +
      '<p><b>Implied value = TVL × peer multiple × growth × maturity × reach.</b> ' +
      'The <b>peer multiple</b> is the median market cap / TVL of the tokenized protocols in the same category in this snapshot — the market\u2019s own price for that kind of TVL. ' +
      'A category with fewer than ' + m.peer_min_peers + ' tokenized peers falls back to the market-wide median, <b>' + R.global_multiple.toFixed(3) + '</b>. ' +
      'The multiple is clamped to [' + m.multiple_floor + ', ' + m.multiple_cap + '].</p>' +
      '<p><b>Growth</b> = 1 + clamp(7-day change, ' + m.growth_floor + '%, ' + m.growth_cap + '%) × ' + m.growth_weight + '. ' +
      '<b>Maturity</b> = ' + m.maturity_floor + ' + min(age, ' + m.maturity_days + ' days) / ' + m.maturity_days + ' × ' + m.maturity_range + ' — a protocol that has run longer with no token has had longer to earn one. ' +
      '<b>Reach</b> = 1.00 on one chain, ' + m.reach_two_chains + ' on two, ' + m.reach_many_chains + ' on three or more.</p>' +
      '<p>Nothing here is a hardcoded list of names: the same function scores every row, and each detail view shows its own arithmetic. ' +
      'Implied value is a model\u2019s estimate of a launch, not a price — and no farm plan promises an airdrop.</p>' +
      '<table class="peer-table"><thead><tr><th>Category</th><th class="num">Tokenized peers</th><th class="num">Peer multiple</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p>Categories with fewer than ' + m.peer_min_peers + ' tokenized peers are not listed: they use the market-wide median ' + R.global_multiple.toFixed(3) + '.</p>' +
      '</details>';
  }

  // ---------------------------------------------------------------- board
  function filteredRows(s) {
    var q = s.q.trim().toLowerCase();
    var rows = R.rows.filter(function (r) {
      if (s.scope === 'watchlist' && !r.watchlist) return false;
      if (s.scope === 'early' && r.watchlist) return false;
      if (s.category && r.category !== s.category) return false;
      if (s.chain && (r.chains || []).indexOf(s.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var sort = s.sort;
    rows.sort(function (a, b) {
      if (sort === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (sort === 'growth') return (b.change_7d || 0) - (a.change_7d || 0);
      if (sort === 'age') return (b.age_days || 0) - (a.age_days || 0);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return b.implied_value_usd - a.implied_value_usd;
    });
    return rows;
  }
  function boardHtml(s) {
    var rows = filteredRows(s);
    var max = R.rows[0].implied_value_usd;
    var body = rows.map(function (r) {
      var w = Math.max(2, Math.round((r.implied_value_usd / max) * 100));
      var chains = (r.chains || []).slice(0, 3).join(', ');
      return '<tr class="' + (r.watchlist ? 'watch' : 'early') + '" data-slug="' + esc(r.slug) + '">' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '<span class="sub">' + esc(r.slug) + '</span></span></td>' +
        '<td><span class="tag ' + (r.watchlist ? 'watch' : 'early') + '">' + (r.watchlist ? 'Watchlist' : 'Early') + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(chains) + '</td>' +
        '<td class="num">' + compact(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + days(r.age_days) + '</td>' +
        '<td class="num">' + r.peer_multiple.toFixed(3) + (r.peer_fallback ? ' *' : '') + '</td>' +
        '<td class="num"><span class="value">' + money(r.implied_value_usd) + '</span><span class="bar"><i style="width:' + w + '%"></i></span></td>' +
        '</tr>';
    }).join('');
    return '<div class="controls">' +
      '<label>Search<input type="search" id="q" value="' + esc(s.q) + '" placeholder="Name, slug or category"></label>' +
      '<label>Category<select id="category"><option value="">All categories</option>' +
      CATS.map(function (c) { return '<option value="' + esc(c) + '"' + (s.category === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
      '<label>Chain<select id="chain"><option value="">All chains</option>' +
      CHAINS.map(function (c) { return '<option value="' + esc(c) + '"' + (s.chain === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
      '<label>Sort<select id="sort">' +
      '<option value="implied"' + (s.sort === 'implied' ? ' selected' : '') + '>Implied value</option>' +
      '<option value="tvl"' + (s.sort === 'tvl' ? ' selected' : '') + '>TVL</option>' +
      '<option value="growth"' + (s.sort === 'growth' ? ' selected' : '') + '>7-day growth</option>' +
      '<option value="age"' + (s.sort === 'age' ? ' selected' : '') + '>Age</option>' +
      '<option value="name"' + (s.sort === 'name' ? ' selected' : '') + '>Name</option>' +
      '</select></label>' +
      '<div class="seg" role="group" aria-label="Scope">' +
      '<button type="button" data-scope="all"' + (s.scope === 'all' ? ' aria-pressed="true"' : '') + '>All ' + R.board_size + '</button>' +
      '<button type="button" data-scope="watchlist"' + (s.scope === 'watchlist' ? ' aria-pressed="true"' : '') + '>Watchlist</button>' +
      '<button type="button" data-scope="early"' + (s.scope === 'early' ? ' aria-pressed="true"' : '') + '>Early</button>' +
      '</div>' +
      '<div class="seg view-toggle" role="group" aria-label="View">' +
      '<button type="button" data-view="board" aria-pressed="true">Board</button>' +
      '<button type="button" data-view="live">Live tokens</button>' +
      '</div>' +
      '</div>' +
      '<p class="count">Showing <b>' + rows.length + '</b> of ' + R.board_size + ' ranked protocols. ' +
      'A <span class="tag watch">Watchlist</span> row sits at or above the ' + compact(R.floor_usd) + ' floor; an <span class="tag early">Early</span> row is below it. ' +
      '* after a peer multiple means the market-wide median was used — the category has fewer than ' + R.model.peer_min_peers + ' tokenized peers.</p>' +
      '<div class="table-wrap"><table class="board"><caption>Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.</caption>' +
      '<thead><tr><th>#</th><th>Protocol</th><th></th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">7d</th><th class="num">Age</th><th class="num">Peer ×</th><th class="num">Implied value</th></tr></thead>' +
      '<tbody>' + (body || '<tr><td colspan="10" class="empty">No protocol matches these filters.</td></tr>') + '</tbody></table></div>';
  }

  // ---------------------------------------------------------------- live view
  function liveHtml(s) {
    var body = R.live.map(function (r, i) {
      var ratio = r.mcap_usd && r.tvl_usd ? (r.mcap_usd / r.tvl_usd).toFixed(3) : '—';
      return '<tr><td class="rank">' + (i + 1) + '</td>' +
        '<td><span class="name">' + esc(r.name) + '<span class="sub">' + esc(r.slug) + '</span></span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc((r.chains || []).slice(0, 3).join(', ')) + '</td>' +
        '<td class="num">' + compact(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + (r.mcap_usd ? compact(r.mcap_usd) : '—') + '</td>' +
        '<td class="num">' + ratio + '</td></tr>';
    }).join('');
    return '<div class="controls"><div class="seg view-toggle" role="group" aria-label="View">' +
      '<button type="button" data-view="board">Board</button>' +
      '<button type="button" data-view="live" aria-pressed="true">Live tokens</button>' +
      '</div></div>' +
      '<p class="count">The <b>' + R.live.length + '</b> largest tokenized protocols in the snapshot, by market cap. ' +
      'They are shown with the market\u2019s own values — never mixed into the ranked board — because their peer multiples are what the board\u2019s model is built from.</p>' +
      '<div class="table-wrap"><table class="board"><caption>Tokenized protocols: the market\u2019s own values, not a model\u2019s.</caption>' +
      '<thead><tr><th>#</th><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">7d</th><th class="num">Market cap</th><th class="num">Mcap / TVL</th></tr></thead>' +
      '<tbody>' + body + '</tbody></table></div>';
  }

  // ---------------------------------------------------------------- detail
  function detailHtml(p) {
    var again = recompute(p);
    var agree = again === p.implied_value_usd;
    var peerLine = p.peer_fallback
      ? (p.category || 'This category') + ' has fewer than ' + R.model.peer_min_peers + ' tokenized peers in this snapshot, so this row uses the market-wide median ' + p.peer_multiple.toFixed(3) + '.'
      : 'The median market cap / TVL of ' + p.peer_count + ' tokenized ' + (p.category || 'peer') + ' protocol' + (p.peer_count === 1 ? '' : 's') + ' in this snapshot.';
    var steps = farmSteps(p).map(function (st) {
      return '<li>' + esc(st.text) + '<div class="cost"><b>Cost:</b> ' + esc(st.cost) + ' · <b>Time:</b> ' + esc(st.time) + '</div></li>';
    }).join('');
    return '<a class="back" href="#">← Back to the board</a>' +
      '<div class="detail-head"><p class="kicker" style="margin-top:0">Rank ' + p.rank + ' · ' + (p.watchlist ? 'Watchlist' : 'Early radar') + ' · ' + esc(p.category || 'No category') + '</p>' +
      '<h2>' + esc(p.name) + '</h2>' +
      '<p class="meta">' + esc(p.slug) + ' · ' + esc((p.chains || []).join(', ')) + ' · listed ' + esc(p.listed_at || 'unknown') + ' · no token</p></div>' +
      '<div class="grid">' +
      '<div class="cell"><div class="k">Implied value</div><div class="v">' + money(p.implied_value_usd) + '</div><div class="n">model ' + esc(R.model_version) + '</div></div>' +
      '<div class="cell"><div class="k">TVL</div><div class="v">' + compact(p.tvl_usd) + '</div><div class="n">' + money(p.tvl_usd) + '</div></div>' +
      '<div class="cell"><div class="k">7-day change</div><div class="v">' + (p.change_7d == null ? '—' : (p.change_7d > 0 ? '+' : '') + p.change_7d.toFixed(1) + '%') + '</div><div class="n">growth × ' + p.growth_multiplier.toFixed(3) + '</div></div>' +
      '<div class="cell"><div class="k">Age with no token</div><div class="v">' + days(p.age_days) + '</div><div class="n">maturity × ' + p.maturity_multiplier.toFixed(3) + '</div></div>' +
      '</div>' +
      '<div class="model"><h2>Why this rank</h2><table>' +
      '<tr><td>TVL</td><td>' + money(p.tvl_usd) + '</td></tr>' +
      '<tr><td>Peer multiple <span class="why">— ' + esc(peerLine) + '</span></td><td>× ' + p.peer_multiple.toFixed(3) + '</td></tr>' +
      '<tr><td>Growth <span class="why">— 7-day change ' + (p.change_7d == null ? 'unknown' : p.change_7d.toFixed(1) + '%') + '</span></td><td>× ' + p.growth_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Maturity <span class="why">— ' + days(p.age_days) + ' with no token</span></td><td>× ' + p.maturity_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Reach <span class="why">— TVL on ' + (p.chains || []).length + ' chain' + ((p.chains || []).length === 1 ? '' : 's') + '</span></td><td>× ' + p.reach_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Implied value</td><td>' + money(p.implied_value_usd) + '</td></tr>' +
      '</table>' +
      '<p class="check">' + (agree ? '✓ The page recomputes this row as ' + money(again) + ' — the same number board.json carries.' : '⚠ The page recomputes this row as ' + money(again) + ', not ' + money(p.implied_value_usd) + '.') + '</p></div>' +
      '<h3>Farm plan — six steps, if this protocol ever rewards its users</h3>' +
      '<ol class="steps">' + steps + '</ol>' +
      '<p class="note" style="margin-top:14px"><b>No airdrop is promised.</b> This plan positions a wallet so it is counted if ' + esc(p.name) + ' ever rewards its users. ' +
      'Check the protocol\u2019s own pages before you act: points programs, eligibility and snapshots change, and a link that is not on the protocol\u2019s own site is not to be trusted.</p>';
  }

  // ---------------------------------------------------------------- render
  function render() {
    var s = stateFromHash();
    var html = statsHtml() + methodHtml();
    if (s.p) {
      var p = bySlug(s.p);
      html += p ? detailHtml(p) : '<p class="empty">No protocol on the board has the slug “' + esc(s.p) + '”.</p><p><a href="#">← Back to the board</a></p>';
    } else if (s.view === 'live') {
      html += liveHtml(s);
    } else {
      html += boardHtml(s);
    }
    app.innerHTML = html;
    bind(s);
  }
  function bind(s) {
    var q = document.getElementById('q');
    if (q) q.addEventListener('input', function () { s.q = q.value; s.p = ''; setHash(s); render(); });
    var cat = document.getElementById('category');
    if (cat) cat.addEventListener('change', function () { s.category = cat.value; s.p = ''; setHash(s); render(); });
    var ch = document.getElementById('chain');
    if (ch) ch.addEventListener('change', function () { s.chain = ch.value; s.p = ''; setHash(s); render(); });
    var so = document.getElementById('sort');
    if (so) so.addEventListener('change', function () { s.sort = so.value; s.p = ''; setHash(s); render(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-scope]'), function (b) {
      b.addEventListener('click', function () { s.scope = b.getAttribute('data-scope'); s.p = ''; setHash(s); render(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) {
      b.addEventListener('click', function () { s.view = b.getAttribute('data-view'); s.p = ''; setHash(s); render(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('tr[data-slug]'), function (tr) {
      tr.addEventListener('click', function () { s.p = tr.getAttribute('data-slug'); setHash(s); render(); window.scrollTo(0, 0); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('a.back, a[href="#"]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); s.p = ''; setHash(s); render(); });
    });
  }
  window.addEventListener('hashchange', render);
  render();
})();
