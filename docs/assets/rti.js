(async function () {
  const $ = id => document.getElementById(id);
  const E = window.TenderEngine;
  const data = await fetch('data/tenders.sample.json').then(r => r.json());
  if (!data.synthetic) $('synBanner').style.display = 'none';
  const res = E.scoreAll(data.tenders);
  const ranked = [...res.scored].sort((a, b) => b.score - a.score).slice(0, 60);
  $('tender').innerHTML = ranked.map(s => `<option value="${s.tender.tender_id}">${s.score} · ${s.tender.tender_id} · ${s.tender.org_short} · ${s.tender.category}</option>`).join('');
  const qs = new URLSearchParams(location.search).get('tender');
  if (qs && ranked.some(s => s.tender.tender_id === qs)) $('tender').value = qs;
  $('aDate').value = new Date().toISOString().slice(0, 10);

  let mode = 'rti';
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const fmt = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

  function items(s) {
    const t = s.tender, keys = new Set(s.reasons.map(r => r.key)), q = [];
    q.push('Certified copies of the tender notice and every corrigendum or extension notice issued for the tender, with dates of publication.');
    q.push('The estimate of cost approved for the work, including the rate analysis and the name and designation of the approving authority and the date of approval.');
    q.push('The comparative statement of all bids received, the technical and financial evaluation sheets, and the name and quoted amount of every bidder.');
    q.push('The note or order recording the decision to accept the successful bid, with the name and designation of the competent authority.');
    if (keys.has('single_bidder')) q.push('The number of times this work was advertised, the reasons recorded for proceeding with a single bid, and any negotiation records.');
    if (keys.has('near_estimate') || keys.has('low_bid_spread')) q.push('The dates on which the estimate was finalised and the tender was published, and the basis (schedule of rates or market survey) used for the estimate.');
    if (keys.has('extensions')) q.push('The reasons recorded for each extension of the bid deadline and the order approving each extension.');
    if (keys.has('ring')) q.push('The declarations or affidavits submitted by bidders on eligibility and conflict of interest, and the registration details of the bidders as submitted.');
    if (keys.has('splitting')) q.push('A list of works of the same nature sanctioned in the same ward or area during the three months before and after this tender, with estimate, approval authority and date for each, and the basis on which the works were packaged.');
    if (t.status === 'awarded') {
      q.push('The work order and agreement, including the defect liability period and the date of commencement and scheduled completion.');
      q.push('Measurement book entries, running and final bills, and the dates and amounts of all payments made.');
      q.push('The completion certificate, and any quality-control or third-party inspection reports for the work.');
    }
    return q;
  }

  function rtiText(s) {
    const t = s.tender, auth = $('aAuth').value || '[Department / public authority]';
    const body = items(s).map((q, i) => `${i + 1}. ${q}`).join('\n');
    return `To,
The Public Information Officer,
${auth},
${t.organisation}

Date: ${fmt($('aDate').value)}

Subject: Application under Section 6(1) of the Right to Information Act, 2005, regarding tender ${t.tender_id} (${t.category})

Sir/Madam,

I request the following information relating to tender ${t.tender_id}, published on ${fmt(t.published_on)}, for ${t.category.toLowerCase()} work with an estimated cost of Rs ${t.estimated_cost_cr.toFixed(2)} crore:

${body}

I request that the information be provided as certified photocopies, or in electronic form where available. I am enclosing the application fee as prescribed [attach fee proof in the form accepted by the authority]. If any part of this application relates to another public authority, please transfer it under Section 6(3) and inform me. If any information is withheld, please state the specific provision of the Act relied upon and the name and designation of the officer who took that decision.

Much of this information is expected to be available under the proactive-disclosure duty in Section 4(1)(b).

Yours faithfully,
${$('aName').value || '[Your name]'}
${$('aAddr').value || '[Your postal address and contact]'}`;
  }

  function appealText(s) {
    const t = s.tender, due = addDays($('aDate').value, 30);
    return `To,
The First Appellate Authority,
${$('aAuth').value || '[Department / public authority]'},
${t.organisation}

Date: [date]

Subject: First appeal under Section 19(1) of the Right to Information Act, 2005

Sir/Madam,

1. I filed an RTI application dated ${fmt($('aDate').value)} (reference no. [number, if any]) with the Public Information Officer of the above authority, seeking information on tender ${t.tender_id}.
2. [Select one and delete the other]
   (a) No reply was received within 30 days (due by ${fmt(due)}).
   (b) The reply dated [date] is incomplete or refuses information without a valid ground. The items not provided are: [list item numbers].
3. I request that you direct the Public Information Officer to provide the information sought, free of charge where the statutory time limit was missed (Section 7(6)), and to state the exemption relied upon for any item withheld.
4. Copies of my application, the reply (if any) and proof of filing are enclosed.

Yours faithfully,
${$('aName').value || '[Your name]'}
${$('aAddr').value || '[Your postal address and contact]'}`;
  }

  function deadlines() {
    const f = $('aDate').value; if (!f) { $('dl').innerHTML = ''; return; }
    const reply = addDays(f, 30), appealBy = addDays(reply, 30), decide = addDays(appealBy, 30);
    $('dl').innerHTML = `<table>
      <tr><td>Reply due from PIO</td><td><b>${fmt(reply)}</b> (30 days)</td></tr>
      <tr><td>File first appeal by</td><td>${fmt(appealBy)} (30 days after the reply or the due date)</td></tr>
      <tr><td>Appeal to be decided by</td><td>${fmt(decide)} (30 days, extendable to 45) if filed on the last day</td></tr>
      <tr><td>Second appeal window</td><td>90 days from the appellate decision or its due date</td></tr></table>
      <p class="cav">Standard timelines under the RTI Act, 2005. Where life or liberty is involved the PIO must reply within 48 hours. Check current state rules.</p>`;
  }

  function render() {
    const s = ranked.find(x => x.tender.tender_id === $('tender').value);
    $('why').textContent = 'Signals: ' + (s.reasons.map(r => r.label).join('; ') || 'none') + ` (score ${s.score}).`;
    $('out').value = mode === 'rti' ? rtiText(s) : appealText(s);
    deadlines();
  }
  $('bRti').onclick = () => { mode = 'rti'; $('bRti').classList.add('on'); $('bApp').classList.remove('on'); render(); };
  $('bApp').onclick = () => { mode = 'app'; $('bApp').classList.add('on'); $('bRti').classList.remove('on'); render(); };
  ['tender', 'aName', 'aAddr', 'aDate', 'aAuth'].forEach(id => $(id).addEventListener('input', render));
  $('copy').onclick = async () => { try { await navigator.clipboard.writeText($('out').value); $('copied').textContent = 'Copied.'; } catch { $('out').select(); $('copied').textContent = 'Press Ctrl+C to copy.'; } setTimeout(() => $('copied').textContent = '', 2500); };
  render();
})().catch(e => { document.querySelector('main').insertAdjacentHTML('afterbegin', `<div class="banner">Could not load: ${String(e.message).replace(/</g, '&lt;')}. Serve over HTTP (python3 -m http.server).</div>`); });
