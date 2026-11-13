/*
 * Tender risk engine: explainable screens for public-procurement data.
 * Works in the browser (window.TenderEngine) and in Node (module.exports).
 *
 * IMPORTANT: every screen is a triage heuristic. A high score means "review this tender",
 * never "this tender is corrupt". Each reason carries its own caveat.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TenderEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const sum = a => a.reduce((x, y) => x + y, 0);
  const mean = a => (a.length ? sum(a) / a.length : NaN);
  const std = a => {
    if (a.length < 2) return NaN;
    const m = mean(a);
    return Math.sqrt(sum(a.map(x => (x - m) ** 2)) / (a.length - 1));
  };
  const median = a => {
    if (!a.length) return NaN;
    const s = [...a].sort((x, y) => x - y), h = s.length >> 1;
    return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
  };
  const dayNum = iso => Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);

  const ratio = t => (t.awarded_value_cr != null && t.estimated_cost_cr > 0 ? t.awarded_value_cr / t.estimated_cost_cr : null);

  /* ---------- Benford's law (first digit) ---------- */
  const BENFORD = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => Math.log10(1 + 1 / d));
  function firstDigit(x) {
    if (!(x > 0)) return null;
    const s = x.toExponential().charAt(0);
    return +s;
  }
  /** Nigrini's MAD conformity bands for first-digit tests. */
  function benfordMAD(values) {
    const counts = Array(9).fill(0);
    let n = 0;
    for (const v of values) { const d = firstDigit(v); if (d) { counts[d - 1]++; n++; } }
    if (n < 100) return { n, observed: counts.map(() => NaN), expected: BENFORD, mad: NaN, verdict: 'too few values (need ≥100)', counts };
    const observed = counts.map(c => c / n);
    const mad = mean(observed.map((o, i) => Math.abs(o - BENFORD[i])));
    const verdict = mad < 0.006 ? 'close conformity' : mad < 0.012 ? 'acceptable conformity' : mad < 0.015 ? 'marginal conformity' : 'nonconformity';
    const chi2 = sum(observed.map((o, i) => (n * (o - BENFORD[i]) ** 2) / BENFORD[i]));
    return { n, observed, expected: BENFORD, mad, chi2, verdict, counts };
  }

  /* ---------- Bid-pattern screens ---------- */
  /** Coefficient of variation of submitted bids. Unusually low CV with several bidders can signal coordinated pricing. */
  function bidCV(t) {
    const q = (t.bidders || []).map(b => b.quoted_cr).filter(x => x > 0);
    if (q.length < 3) return null;
    return std(q) / mean(q);
  }

  /* ---------- Co-bidding network ---------- */
  /**
   * Pairs of firms that bid on the same tender. Compare observed co-bids with the count expected if
   * each firm bid independently (lift). Also computes how often the winner of a tender with ≥2
   * members of a pair is rotated between them.
   */
  function coBidding(tenders, opts = {}) {
    const minCo = opts.minCo ?? 4, minLift = opts.minLift ?? 1.8, minZ = opts.minZ ?? 5;
    const N = tenders.length || 1;
    const appear = new Map(), wins = new Map(), pair = new Map(), pairWins = new Map();
    for (const t of tenders) {
      const names = [...new Set((t.bidders || []).map(b => b.name))];
      for (const n of names) appear.set(n, (appear.get(n) || 0) + 1);
      if (t.awarded_to) wins.set(t.awarded_to, (wins.get(t.awarded_to) || 0) + 1);
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
        const k = [names[i], names[j]].sort().join(' | ');
        pair.set(k, (pair.get(k) || 0) + 1);
        if (t.awarded_to === names[i] || t.awarded_to === names[j]) {
          const w = pairWins.get(k) || {}; w[t.awarded_to] = (w[t.awarded_to] || 0) + 1; pairWins.set(k, w);
        }
      }
    }
    const edges = [];
    for (const [k, c] of pair) {
      const [a, b] = k.split(' | ');
      const expected = (appear.get(a) / N) * (appear.get(b) / N) * N;
      const lift = c / Math.max(expected, 1e-9);
      const z = (c - expected) / Math.sqrt(Math.max(expected, 1e-9)); // Poisson-style excess over independence
      const w = pairWins.get(k) || {};
      const wa = w[a] || 0, wb = w[b] || 0;
      const rotation = wa + wb > 0 ? Math.min(wa, wb) / Math.max(wa, wb) : 0; // 1 = perfectly alternating
      edges.push({ a, b, count: c, expected: +expected.toFixed(2), lift: +lift.toFixed(2), z: +z.toFixed(1), rotation: +rotation.toFixed(2), suspect: c >= minCo && lift >= minLift && z >= minZ });
    }
    edges.sort((x, y) => y.lift * Math.log(1 + y.count) - x.lift * Math.log(1 + x.count));
    const nodes = [...appear].map(([name, bids]) => ({ name, bids, wins: wins.get(name) || 0 }));
    const suspectNames = new Set(edges.filter(e => e.suspect).flatMap(e => [e.a, e.b]));
    return { nodes, edges, suspectNames };
  }

  /* ---------- Contract splitting ---------- */
  /**
   * Group awarded/open tenders by organisation + category + ward, then find windows of `windowDays`
   * containing ≥ minCount tenders each between `band` × threshold and the threshold, whose total exceeds the threshold.
   */
  function splitting(tenders, opts = {}) {
    const T = opts.threshold ?? 3, windowDays = opts.windowDays ?? 14, minCount = opts.minCount ?? 3, band = opts.band ?? 0.85;
    const groups = new Map();
    for (const t of tenders) {
      if (!(t.estimated_cost_cr < T && t.estimated_cost_cr >= band * T)) continue;
      const k = [t.organisation, t.category, t.ward || t.city].join('|');
      (groups.get(k) || groups.set(k, []).get(k)).push(t);
    }
    const clusters = [], used = new Set();
    for (const [k, g] of groups) {
      g.sort((a, b) => dayNum(a.published_on) - dayNum(b.published_on));
      for (let i = 0; i < g.length; i++) {
        if (used.has(g[i].tender_id)) continue;
        const win = g.filter(x => !used.has(x.tender_id) && dayNum(x.published_on) >= dayNum(g[i].published_on) && dayNum(x.published_on) - dayNum(g[i].published_on) <= windowDays);
        if (win.length >= minCount && sum(win.map(x => x.estimated_cost_cr)) > T) {
          win.forEach(x => used.add(x.tender_id));
          const [organisation, category, place] = k.split('|');
          clusters.push({ organisation, category, place, tenders: win.map(x => x.tender_id), count: win.length, total_cr: +sum(win.map(x => x.estimated_cost_cr)).toFixed(2), start: win[0].published_on, threshold: T });
        }
      }
    }
    return clusters.sort((a, b) => b.total_cr - a.total_cr);
  }

  /* ---------- Robust outliers on award/estimate ---------- */
  function ratioOutliers(tenders) {
    const r = tenders.map(ratio).filter(x => x != null);
    const med = median(r), mad = median(r.map(x => Math.abs(x - med))) || 1e-9;
    return { median: med, mad, z: t => { const x = ratio(t); return x == null ? null : (0.6745 * (x - med)) / mad; } };
  }

  /* ---------- Composite, explainable risk score ---------- */
  const WEIGHTS = {
    single_bidder: 20, near_estimate: 15, low_bid_spread: 15, extensions: 10, ring: 20, splitting: 15, late_season: 5
  };

  /**
   * Score each tender 0-100 from independent screens. Each reason lists its points and a caveat so that
   * a reviewer sees why, and what innocent explanation could apply.
   */
  function scoreAll(tenders, opts = {}) {
    const ring = coBidding(tenders, opts);
    const split = splitting(tenders, opts.splitting || {});
    const splitIds = new Map();
    split.forEach((c, i) => c.tenders.forEach(id => splitIds.set(id, i)));
    const suspectPairs = ring.edges.filter(e => e.suspect);
    const out = [];
    for (const t of tenders) {
      const reasons = [], r = ratio(t), nb = (t.bidders || []).length;
      const add = (key, points, label, detail, caveat) => reasons.push({ key, points: +points.toFixed(1), label, detail, caveat });

      if (nb === 1) add('single_bidder', WEIGHTS.single_bidder, 'Single bidder', 'Only one bid was received.', 'Common for specialised or remote works.');
      if (r != null && r >= 0.97 && r <= 1.0) add('near_estimate', WEIGHTS.near_estimate, 'Award at 97–100% of estimate', `Awarded at ${(r * 100).toFixed(1)}% of estimate.`, 'Estimates often come from published rate schedules, so close bids are plausible.');
      const cv = bidCV(t);
      if (cv != null && cv < 0.03) add('low_bid_spread', WEIGHTS.low_bid_spread * Math.min(1, (0.03 - cv) / 0.02 + 0.4), 'Unusually tight bids', `Bid spread (CV) ${(cv * 100).toFixed(1)}% across ${nb} bidders.`, 'Standard-rate works can also produce tight bids.');
      if ((t.extensions || 0) >= 2) add('extensions', WEIGHTS.extensions * Math.min(1, t.extensions / 3), 'Repeated deadline extensions', `${t.extensions} extensions.`, 'Often administrative (clarifications, portal issues).');
      const names = new Set((t.bidders || []).map(b => b.name));
      const inRing = suspectPairs.filter(e => names.has(e.a) && names.has(e.b));
      if (inRing.length) {
        const e = inRing[0];
        add('ring', WEIGHTS.ring * Math.min(1, 0.6 + 0.4 * e.rotation), 'Frequent co-bidders', `${e.a} and ${e.b} appear together in ${e.count} tenders (expected ≈ ${e.expected}, z = ${e.z}); winner rotation ${(e.rotation * 100).toFixed(0)}%.`, 'Firms in a niche market may legitimately meet often.');
      }
      if (splitIds.has(t.tender_id)) {
        const c = split[splitIds.get(t.tender_id)];
        add('splitting', WEIGHTS.splitting, 'Possible contract splitting', `${c.count} similar works (${c.category}, ${c.place}) within a fortnight, each just under ₹${c.threshold} cr, totalling ₹${c.total_cr} cr.`, 'Works may be genuinely separate; the threshold used here is illustrative.');
      }
      const m = +(t.published_on || '').slice(5, 7);
      if ((t.category === 'Roads' || t.category === 'Drains (SWD)') && m >= 6 && m <= 9) add('late_season', WEIGHTS.late_season, 'Published during the monsoon', `Published in month ${m}; works awarded now leave little pre-monsoon time.`, 'Some works are intentionally post-monsoon.');
      const score = Math.min(100, Math.round(sum(reasons.map(x => x.points))));
      out.push({ tender: t, score, level: score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low', reasons });
    }
    return { scored: out, ring, splitting: split };
  }

  return { ratio, benfordMAD, bidCV, coBidding, splitting, ratioOutliers, scoreAll, WEIGHTS, BENFORD, _util: { mean, std, median, firstDigit } };
});
