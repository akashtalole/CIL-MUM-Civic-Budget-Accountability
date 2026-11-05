(async function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n, d = 1) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = x => (x * 100).toFixed(0) + '%';
  const ACC = '#4cc3ff', WARN = '#f5a623', BAD = '#ff4d4f', OK = '#2ecc71', MUTE = '#8fa1bd';
  if (window.Chart) {
    Chart.defaults.color = MUTE; Chart.defaults.borderColor = '#1d2a4a'; Chart.defaults.font.family = 'system-ui';
    Chart.defaults.maintainAspectRatio = false;
  }
  const charts = {};
  function draw(id, cfg) { charts[id]?.destroy(); if (window.Chart) charts[id] = new Chart($(id), cfg); }

  const [orgs, tdata] = await Promise.all([
    fetch('data/organisations.json').then(r => r.json()),
    fetch('data/tenders.sample.json').then(r => r.json())
  ]);

  /* ---- 1. real snapshot ---- */
  $('realBanner').innerHTML = `<b>Real data.</b> Tender counts per organisation as shown on the public
    <a href="${esc(orgs.source)}">Maharashtra eProcurement organisation list</a> on <b>${esc(orgs.snapshot_date)}</b>.
    Counts change daily, and this is a one-off snapshot, not a live feed.`;
  const o = [...orgs.organisations].sort((a, b) => b.tenders - a.tenders);
  draw('cOrg', {
    type: 'bar',
    data: { labels: o.map(x => x.short), datasets: [{ label: 'Active tenders', data: o.map(x => x.tenders), backgroundColor: o.map(x => x.region === 'Mumbai' ? ACC : OK) }] },
    options: { indexAxis: 'y', scales: { y: { ticks: { autoSkip: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: i => o[i[0].dataIndex].name, afterLabel: i => o[i[0].dataIndex].region === 'Mumbai' ? 'Mumbai city' : 'MMR' } } } }
  });

  /* ---- 2. synthetic tender indicators ---- */
  const T = tdata.tenders;
  if (!tdata.synthetic) { document.querySelectorAll('.banner:not(.real)').forEach(b => b.style.display = 'none'); }
  const MUMBAI_CITY = c => c === 'Mumbai';
  const orgNames = [...new Set(T.map(t => t.org_short))];
  const cats = [...new Set(T.map(t => t.category))].sort();
  $('fOrg').innerHTML = '<option value="all">All organisations</option>' + orgNames.map(n => `<option>${esc(n)}</option>`).join('');
  $('fCat').innerHTML = '<option value="all">All categories</option>' + cats.map(n => `<option>${esc(n)}</option>`).join('');

  const ratio = t => t.awarded_value_cr != null ? t.awarded_value_cr / t.estimated_cost_cr : null;
  const flagsOf = t => {
    const f = [], r = ratio(t);
    if (t.bidders.length === 1) f.push('Single bidder');
    if (r != null && r >= 0.97 && r <= 1.0) f.push('Award at 97–100% of estimate');
    if (t.extensions >= 2) f.push(t.extensions + ' extensions');
    return f;
  };
  const sum = a => a.reduce((x, y) => x + y, 0);
  const monthKey = d => d.slice(0, 7);

  function filtered() {
    const org = $('fOrg').value, cat = $('fCat').value, reg = $('fRegion').value;
    return T.filter(t => (org === 'all' || t.org_short === org) && (cat === 'all' || t.category === cat) &&
      (reg === 'all' || (reg === 'Mumbai' ? MUMBAI_CITY(t.city) : !MUMBAI_CITY(t.city))));
  }

  function render() {
    const D = filtered(), A = D.filter(t => t.status === 'awarded');
    const est = sum(D.map(t => t.estimated_cost_cr)), aw = sum(A.map(t => t.awarded_value_cr));
    const single = D.length ? D.filter(t => t.bidders.length === 1).length / D.length : 0;
    const near = A.length ? A.filter(t => { const r = ratio(t); return r >= .97 && r <= 1; }).length / A.length : 0;
    const ext = D.length ? D.filter(t => t.extensions >= 2).length / D.length : 0;
    const kp = [['Tenders', D.length], ['Estimated (₹ cr)', num(est, 0)], ['Awarded (₹ cr)', num(aw, 0)],
      ['Single-bidder', pct(single)], ['Awarded at 97–100% of est.', pct(near)], ['≥2 extensions', pct(ext)]];
    $('kpis').innerHTML = kp.map(([l, v]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');

    // monthly
    const mm = {};
    D.forEach(t => { const k = monthKey(t.published_on); (mm[k] ??= { e: 0, a: 0 }).e += t.estimated_cost_cr; if (t.status === 'awarded') mm[k].a += t.awarded_value_cr; });
    const mk = Object.keys(mm).sort();
    draw('cMonth', { type: 'bar', data: { labels: mk, datasets: [
      { label: 'Estimated', data: mk.map(k => +mm[k].e.toFixed(1)), backgroundColor: '#2b4a7a' },
      { label: 'Awarded', data: mk.map(k => +mm[k].a.toFixed(1)), backgroundColor: ACC }] } });

    // ratio histogram
    const bins = Array.from({ length: 14 }, (_, i) => 0.78 + i * 0.02), cnt = bins.map(() => 0);
    A.forEach(t => { const r = ratio(t); let i = Math.floor((r - 0.78) / 0.02); i = Math.max(0, Math.min(bins.length - 1, i)); cnt[i]++; });
    draw('cRatio', { type: 'bar', data: { labels: bins.map(b => pct(b)), datasets: [{ label: 'Tenders', data: cnt, backgroundColor: bins.map(b => b >= .97 && b < 1.0 ? WARN : ACC) }] }, options: { plugins: { legend: { display: false } } } });

    // bidders
    const bc = [1, 2, 3, 4, 5, 6].map(n => D.filter(t => t.bidders.length === n).length);
    draw('cBid', { type: 'bar', data: { labels: ['1', '2', '3', '4', '5', '6+'], datasets: [{ label: 'Tenders', data: bc, backgroundColor: [BAD, ACC, ACC, ACC, ACC, ACC] }] }, options: { plugins: { legend: { display: false } } } });

    // concentration
    const byC = {}; A.forEach(t => byC[t.awarded_to] = (byC[t.awarded_to] || 0) + t.awarded_value_cr);
    const cs = Object.entries(byC).sort((a, b) => b[1] - a[1]), tot = sum(cs.map(c => c[1])) || 1;
    const hhi = Math.round(sum(cs.map(c => (c[1] / tot * 100) ** 2)));
    $('hhi').textContent = `HHI = ${hhi} (below ~1,500 is usually considered unconcentrated, above ~2,500 highly concentrated). Top 3 hold ${pct(sum(cs.slice(0, 3).map(c => c[1])) / tot)}.`;
    const top = cs.slice(0, 8);
    draw('cConc', { type: 'bar', data: { labels: top.map(c => c[0]), datasets: [{ label: 'Share', data: top.map(c => +(c[1] / tot * 100).toFixed(1)), backgroundColor: ACC }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: '% of awarded value' } } } } });

    // season
    const rd = A.filter(t => t.category === 'Roads' || t.category === 'Drains (SWD)');
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sc = mon.map((_, i) => rd.filter(t => +t.published_on.slice(5, 7) === i + 1).length);
    draw('cSeason', { type: 'bar', data: { labels: mon, datasets: [{ label: 'Awarded tenders (by publish month)', data: sc, backgroundColor: mon.map((_, i) => i >= 5 && i <= 8 ? BAD : ACC) }] }, options: { plugins: { legend: { display: false } } } });

    // extensions
    const ec = [0, 1, 2, 3].map(n => D.filter(t => t.extensions === n).length);
    draw('cExt', { type: 'bar', data: { labels: ['0', '1', '2', '3'], datasets: [{ label: 'Tenders', data: ec, backgroundColor: [ACC, ACC, WARN, BAD] }] }, options: { plugins: { legend: { display: false } } } });

    // org comparison (ignores org filter)
    const base = T.filter(t => ($('fCat').value === 'all' || t.category === $('fCat').value));
    const groups = {}; base.forEach(t => (groups[t.org_short] ??= []).push(t));
    const rows = Object.entries(groups).map(([k, g]) => {
      const a = g.filter(t => t.status === 'awarded');
      const bc2 = {}; a.forEach(t => bc2[t.awarded_to] = (bc2[t.awarded_to] || 0) + t.awarded_value_cr);
      const tt = sum(Object.values(bc2)) || 1;
      return { k, n: g.length, v: sum(g.map(t => t.estimated_cost_cr)), s: g.filter(t => t.bidders.length === 1).length / g.length,
        r: a.length ? sum(a.map(ratio)) / a.length : NaN, e: g.filter(t => t.extensions >= 2).length / g.length,
        h: Math.round(sum(Object.values(bc2).map(x => (x / tt * 100) ** 2))) };
    }).sort((a, b) => b.n - a.n);
    $('tOrg').innerHTML = '<tr><th>Organisation</th><th>Tenders</th><th>Estimated (₹ cr)</th><th>Single-bidder</th><th>Avg award ÷ est.</th><th>≥2 extensions</th><th>HHI</th></tr>' +
      rows.map(r => `<tr><td>${esc(r.k)}</td><td>${r.n}</td><td>${num(r.v, 0)}</td><td>${pct(r.s)}</td><td>${isNaN(r.r) ? '–' : pct(r.r)}</td><td>${pct(r.e)}</td><td>${r.h}</td></tr>`).join('');

    // flagged
    const fl = D.map(t => ({ t, f: flagsOf(t) })).filter(x => x.f.length).sort((a, b) => b.f.length - a.f.length || b.t.estimated_cost_cr - a.t.estimated_cost_cr).slice(0, 15);
    $('tFlag').innerHTML = '<tr><th>Tender</th><th>Organisation</th><th>Category</th><th>Est. (₹ cr)</th><th>Awarded (₹ cr)</th><th>Bidders</th><th>Indicators</th></tr>' +
      (fl.length ? fl.map(({ t, f }) => `<tr><td>${esc(t.tender_id)}</td><td>${esc(t.org_short)}</td><td>${esc(t.category)}</td><td>${num(t.estimated_cost_cr, 2)}</td><td>${t.awarded_value_cr == null ? '–' : num(t.awarded_value_cr, 2)}</td><td>${t.bidders.length}</td><td>${f.map(x => `<span class="flag">${esc(x)}</span>`).join('')}</td></tr>`).join('') : '<tr><td colspan="7">No tenders match the current filters.</td></tr>');
  }
  ['fOrg', 'fCat', 'fRegion'].forEach(id => $(id).addEventListener('change', render));
  render();
})().catch(e => { document.querySelector('main').insertAdjacentHTML('afterbegin', `<div class="banner">Could not load data: ${String(e.message).replace(/</g, '&lt;')}. If you opened this file directly, serve it over HTTP instead (python3 -m http.server).</div>`); });
