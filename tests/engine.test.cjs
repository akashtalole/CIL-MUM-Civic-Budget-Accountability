const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const E = require('../docs/assets/engine.js');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/data/tenders.sample.json'), 'utf8'));
const T = data.tenders;
const mk = (o) => ({ tender_id: 'X', organisation: 'Org', category: 'Roads', city: 'Mumbai', published_on: '2026-01-10', estimated_cost_cr: 2, extensions: 0, status: 'awarded', bidders: [], ...o });

test('Benford: genuinely Benford-distributed values conform', () => {
  const vals = Array.from({ length: 5000 }, (_, i) => Math.pow(10, 4 * ((i + 0.5) / 5000)));
  const r = E.benfordMAD(vals);
  assert.ok(r.mad < 0.006, 'MAD ' + r.mad);
  assert.equal(r.verdict, 'close conformity');
});

test('Benford: uniform leading digits do not conform; small samples are refused', () => {
  const vals = Array.from({ length: 900 }, (_, i) => (i % 9) + 1);
  assert.equal(E.benfordMAD(vals).verdict, 'nonconformity');
  assert.match(E.benfordMAD([1, 2, 3]).verdict, /too few/);
});

test('bidCV needs at least 3 bids and is low for clustered bids', () => {
  assert.equal(E.bidCV(mk({ bidders: [{ name: 'a', quoted_cr: 1 }, { name: 'b', quoted_cr: 1 }] })), null);
  const cv = E.bidCV(mk({ bidders: [100, 101, 102].map((q, i) => ({ name: 'n' + i, quoted_cr: q })) }));
  assert.ok(cv < 0.02);
});

test('splitting: finds a planted cluster and ignores spread-out tenders', () => {
  const planted = [0, 3, 6].map((d, i) => mk({ tender_id: 'S' + i, estimated_cost_cr: 2.8, ward: 'K/E', published_on: `2026-02-${String(1 + d).padStart(2, '0')}` }));
  const spread = [0, 40, 80].map((d, i) => mk({ tender_id: 'P' + i, estimated_cost_cr: 2.8, ward: 'A', published_on: new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10) }));
  const c = E.splitting([...planted, ...spread], { threshold: 3 });
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].tenders.sort(), ['S0', 'S1', 'S2']);
  assert.ok(c[0].total_cr > 3);
});

test('coBidding: flags a pair that always bids together and not independent firms', () => {
  const tenders = [];
  for (let i = 0; i < 8; i++) tenders.push(mk({ tender_id: 'R' + i, awarded_to: i % 2 ? 'Q' : 'R', bidders: [{ name: 'Q', quoted_cr: 1 }, { name: 'R', quoted_cr: 1 }] }));
  for (let i = 0; i < 40; i++) tenders.push(mk({ tender_id: 'N' + i, awarded_to: 'F' + (i % 10), bidders: [{ name: 'F' + (i % 10), quoted_cr: 1 }, { name: 'G' + (i % 7), quoted_cr: 1 }] }));
  const net = E.coBidding(tenders);
  const e = net.edges.find(x => (x.a === 'Q' && x.b === 'R'));
  assert.ok(e.suspect, 'Q-R should be suspect');
  assert.ok(e.rotation > 0.8);
  assert.equal(net.edges.filter(x => x.suspect && !(x.a === 'Q' && x.b === 'R')).length, 0);
});

test('scoreAll: clean tender scores low, tender with several screens scores high, reasons carry caveats', () => {
  const clean = mk({ tender_id: 'C', published_on: '2026-02-01', bidders: [{ name: 'a', quoted_cr: 1.5 }, { name: 'b', quoted_cr: 1.9 }, { name: 'c', quoted_cr: 2.1 }], awarded_to: 'a', awarded_value_cr: 1.5 });
  const risky = mk({ tender_id: 'K', published_on: '2026-07-01', extensions: 3, bidders: [{ name: 'z', quoted_cr: 1.97 }], awarded_to: 'z', awarded_value_cr: 1.97 });
  const { scored } = E.scoreAll([clean, risky]);
  const c = scored.find(s => s.tender.tender_id === 'C'), k = scored.find(s => s.tender.tender_id === 'K');
  assert.equal(c.score, 0);
  assert.ok(k.score >= 20, 'risky score ' + k.score);
  assert.ok(k.reasons.length >= 3);
  for (const r of k.reasons) { assert.ok(r.caveat && r.caveat.length > 10); assert.ok(r.points > 0); }
});

test('scoreAll on the sample data: planted ring and splitting clusters are detected, scores bounded', () => {
  const { scored, ring, splitting } = E.scoreAll(T);
  assert.ok(scored.every(s => s.score >= 0 && s.score <= 100));
  const names = [...ring.suspectNames];
  for (const n of ['Contractor Q', 'Contractor R', 'Contractor S']) assert.ok(names.includes(n), n + ' should be in the suspect set');
  assert.ok(splitting.length >= 4, 'clusters found: ' + splitting.length);
  assert.ok(scored.filter(s => s.level === 'high').length > 0);
});
