(async function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const E = window.TenderEngine;
  const data = await fetch('data/tenders.sample.json').then(r => r.json());
  if (!data.synthetic) $('synBanner').style.display = 'none';
  const T = data.tenders;
  const orgs = [...new Set(T.map(t => t.org_short))];
  $('fOrg').innerHTML = '<option value="all">All organisations</option>' + orgs.map(o => `<option>${esc(o)}</option>`).join('');
  $('tW').innerHTML = '<tr><th>Signal</th><th>Max points</th><th>Why it matters</th></tr>' + [
    ['Single bidder', E.WEIGHTS.single_bidder, 'Less competition can mean higher prices.'],
    ['Award at 97–100% of estimate', E.WEIGHTS.near_estimate, 'Bids hugging the estimate can indicate the estimate leaked or bids were coordinated.'],
    ['Unusually tight bids (CV < 3%)', E.WEIGHTS.low_bid_spread, 'Independent bidders usually differ more.'],
    ['Repeated deadline extensions', E.WEIGHTS.extensions, 'Can signal tailoring or a thin market.'],
    ['Frequent co-bidders', E.WEIGHTS.ring, 'Firms that always appear together may be rotating wins (cover bidding).'],
    ['Possible contract splitting', E.WEIGHTS.splitting, 'Splitting keeps each contract below an approval threshold.'],
    ['Published during monsoon (roads, drains)', E.WEIGHTS.late_season, 'Pre-monsoon works awarded late rarely help the monsoon.']
  ].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') +
    '<tr><td colspan="3" class="cav">Score = sum of points, capped at 100. High ≥ 40, medium ≥ 20. Weights are judgement calls and should be tuned with domain experts and labelled cases.</td></tr>';

  let chart;
  function render() {
    const thr = +$('thr').value || 3;
    const org = $('fOrg').value, lvl = $('fLevel').value;
    // Network and splitting screens look at the whole market; the ranking is filtered afterwards.
    const res = E.scoreAll(T, { splitting: { threshold: thr } });
    let rows = res.scored.filter(s => (org === 'all' || s.tender.org_short === org) && (lvl === 'all' || (lvl === 'high' ? s.level === 'high' : s.level !== 'low')));
    rows.sort((a, b) => b.score - a.score || b.tender.estimated_cost_cr - a.tender.estimated_cost_cr);

    const hi = res.scored.filter(s => s.level === 'high').length, med = res.scored.filter(s => s.level === 'medium').length;
    const kp = [['Tenders scored', T.length], ['High', hi], ['Medium', med], ['Suspect co-bidding pairs', res.ring.edges.filter(e => e.suspect).length], ['Splitting clusters', res.splitting.length]];
    $('kpis').innerHTML = kp.map(([l, v]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');

    const top = rows.slice(0, 25);
    $('tRank').innerHTML = '<tr><th>Score</th><th>Tender</th><th>Organisation</th><th>Category</th><th>Est. (₹ cr)</th><th>Bidders</th><th>Signals</th></tr>' +
      (top.length ? top.map((s, i) => `<tr class="row" data-i="${i}"><td><span class="score ${s.level}">${s.score}</span></td><td>${esc(s.tender.tender_id)}</td><td>${esc(s.tender.org_short)}</td><td>${esc(s.tender.category)}</td><td>${s.tender.estimated_cost_cr.toFixed(2)}</td><td>${s.tender.bidders.length}</td><td>${s.reasons.map(r => `<span class="flag">${esc(r.label)}</span>`).join('') || '–'}</td></tr>`).join('') : '<tr><td colspan="7">No tenders match.</td></tr>');
    $('tRank').onclick = ev => {
      const tr = ev.target.closest('tr.row'); if (!tr) return;
      const nxt = tr.nextElementSibling;
      if (nxt && nxt.classList.contains('why')) { nxt.remove(); return; }
      const s = top[+tr.dataset.i];
      const html = s.reasons.length ? s.reasons.map(r => `<div class="rs"><div>${esc(r.label)} <b>+${r.points}</b></div><div><div class="bar"><i style="width:${Math.min(100, r.points * 5)}%"></i></div>${esc(r.detail)}<div class="cav">Innocent explanation: ${esc(r.caveat)}</div></div></div>`).join('') : 'No signals.';
      tr.insertAdjacentHTML('afterend', `<tr class="why"><td colspan="7">${html}<div class="cav" style="margin-top:6px">Next step: request the bid evaluation sheet and rate analysis via <a href="rti.html?tender=${encodeURIComponent(s.tender.tender_id)}">RTI Copilot</a>.</div></td></tr>`);
    };

    // splitting
    $('tSplit').innerHTML = '<tr><th>Organisation</th><th>Category</th><th>Place</th><th>Tenders</th><th>Total (₹ cr)</th><th>From</th><th>IDs</th></tr>' +
      (res.splitting.length ? res.splitting.map(c => `<tr><td>${esc(c.organisation)}</td><td>${esc(c.category)}</td><td>${esc(c.place)}</td><td>${c.count}</td><td>${c.total_cr}</td><td>${esc(c.start)}</td><td>${c.tenders.map(esc).join(', ')}</td></tr>`).join('') : '<tr><td colspan="7">No clusters at this threshold.</td></tr>');

    // Benford
    const b = E.benfordMAD(T.filter(t => t.awarded_value_cr != null).map(t => t.awarded_value_cr));
    $('benTxt').innerHTML = `n = ${b.n}, MAD = ${isNaN(b.mad) ? '–' : b.mad.toFixed(4)} → <b>${esc(b.verdict)}</b>. Benford screens help only for values spanning several orders of magnitude, and nonconformity is not proof of anything.`;
    chart?.destroy();
    if (window.Chart) {
      Chart.defaults.color = '#8fa1bd'; Chart.defaults.borderColor = '#1d2a4a'; Chart.defaults.maintainAspectRatio = false;
      chart = new Chart($('cBen'), { type: 'bar', data: { labels: [1, 2, 3, 4, 5, 6, 7, 8, 9], datasets: [{ label: 'Observed', data: b.observed.map(x => +(x * 100).toFixed(1)), backgroundColor: '#4cc3ff' }, { label: 'Benford expected', type: 'line', data: b.expected.map(x => +(x * 100).toFixed(1)), borderColor: '#f5a623', pointRadius: 3 }] }, options: { scales: { y: { title: { display: true, text: '% of awarded values' } }, x: { title: { display: true, text: 'First digit' } } } } });
    }

    // network (circular layout)
    const svg = $('net'); const nodes = res.ring.nodes.sort((a, b) => b.bids - a.bids);
    const cx = 300, cy = 210, R = 160, pos = {};
    nodes.forEach((n, i) => { const a = (2 * Math.PI * i) / nodes.length - Math.PI / 2; pos[n.name] = [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
    const edges = res.ring.edges.filter(e => e.z >= 3);
    const maxZ = Math.max(...edges.map(e => e.z), 1);
    let out = edges.map(e => `<line x1="${pos[e.a][0]}" y1="${pos[e.a][1]}" x2="${pos[e.b][0]}" y2="${pos[e.b][1]}" stroke="${e.suspect ? '#ff4d4f' : '#2b4a7a'}" stroke-width="${(0.5 + 4 * e.z / maxZ).toFixed(1)}" stroke-opacity="${e.suspect ? 0.9 : 0.5}"><title>${esc(e.a)} + ${esc(e.b)}: ${e.count} shared tenders (expected ${e.expected}), lift ${e.lift}, z ${e.z}, rotation ${(e.rotation * 100).toFixed(0)}%</title></line>`).join('');
    out += nodes.map(n => { const [x, y] = pos[n.name]; const sus = res.ring.suspectNames.has(n.name); return `<circle cx="${x}" cy="${y}" r="${4 + Math.sqrt(n.wins) / 1.6}" fill="${sus ? '#ff4d4f' : '#4cc3ff'}"><title>${esc(n.name)}: ${n.bids} bids, ${n.wins} wins</title></circle><text x="${x + (x > cx ? 9 : -9)}" y="${y + 3}" text-anchor="${x > cx ? 'start' : 'end'}">${esc(n.name.replace('Contractor ', ''))}</text>`; }).join('');
    svg.innerHTML = out;
  }
  ['fOrg', 'fLevel', 'thr'].forEach(id => $(id).addEventListener('change', render));
  render();
})().catch(e => { document.querySelector('main').insertAdjacentHTML('afterbegin', `<div class="banner">Could not load: ${String(e.message).replace(/</g, '&lt;')}. Serve over HTTP (python3 -m http.server).</div>`); });
