# Advanced Solution Stack: From Tender Data to Accountability

How the pieces fit into one end-to-end system for Mumbai and the MMR, what exists today, and what still needs data, partners or validation.

## 1. A reality check

No single tool "solves" civic accountability. Money leaks and promises slip for many reasons: weak procurement, thin competition, poor supervision, opaque data, slow grievance handling. Software can lower the cost of *seeing* and *asking*. People with authority still have to *act*. So the stack below is designed to:

1. get trustworthy data in,
2. rank where to look,
3. help citizens and journalists ask precise questions,
4. check claims against the ground,
5. hand findings to someone who can fix them, in a form they can adopt.

Each layer is honest about what it can and cannot say.

## 2. The stack and its status

| # | Layer | What it does | Status in this repo |
|---|---|---|---|
| 1 | **Ingestion** | Read tender notices, corrigenda, results and work orders (PDF; English/Marathi/Hindi) into a strict schema, with evidence quotes | `pipeline/extract_tender.py`. Validator unit-tested. **The Claude call has not been run against the live API or real documents.** |
| 2 | **Risk engine** | Explainable screens: single bidder, near-estimate awards, tight bids, extensions, co-bidding rings, contract splitting, Benford, season timing | `docs/assets/engine.js`, 7 passing tests. **Validated only on synthetic data with planted patterns.** |
| 3 | **Risk Radar UI** | Ranked tenders, per-signal reasons *with the innocent explanation*, network, Benford, splitting clusters | `docs/radar.html` |
| 4 | **Citizen action** | Tender-specific RTI draft, deadlines, first-appeal draft, escalation ladder; runs fully client-side | `docs/rti.html` |
| 5 | **Spatial view** | 3D digital twin with projects, hospitals, Mithi river, flood hotspots, MMR layer | `docs/twin/` (schematic geometry) |
| 6 | **Ground-truth verification** | Compare "completed" with citizen photos and complaints | Design only (section 4) |
| 7 | **Budget Q&A and promise ledger** | Cited answers from budget documents; commitments tracked to evidence | Design only (section 5) |
| 8 | **Alerts** | Neutral alerts per ward, department or firm over WhatsApp or email | Design only (section 6) |
| 9 | **Governance and handover** | Data-sharing agreement, error-correction route, open standard export | Section 8 |

## 3. Making the data trustworthy (layers 1-2)

- **Strict extraction.** Claude returns JSON that must match a schema. Unknown means `null`, never a guess. Each key field carries a short verbatim quote and a page number.
- **Independent validation.** After extraction, local code re-checks dates, units and consistency (for example, an award/estimate ratio of 90x is almost certainly a lakh-vs-crore error). Failures go to a rejects file and never reach the dashboard.
- **Human sampling.** A person verifies a random sample per batch against the source PDF. Track the error rate per field and publish it.
- **Entity resolution.** "M/s ABC Constructions Pvt. Ltd." and "ABC Constr. (P) Ltd" must resolve to one firm before concentration or co-bidding screens mean anything. Normalise names, then link on registered identifiers (company registration number, GSTIN, PAN where lawfully public). Resolution errors are the biggest silent source of false signals.
- **Snapshots.** Keep dated copies of every notice so amendments and withdrawals stay visible.
- **Open standard.** Export to the Open Contracting Data Standard (OCDS) so other civic-tech teams, journalists and the authorities' own systems can consume it.

## 4. Ground-truth verification (design)

**Goal.** Check whether recorded completion matches what residents see.

**Flow.**

1. A citizen sends a geotagged photo of a road, drain, school or clinic through a web form or a chat bot.
2. Match the location to a project through address, ward and the project's recorded location. Where the match is ambiguous, ask the citizen.
3. A Claude vision step fills a **fixed rubric** (surface condition, standing water, visible defects, signage, work-in-progress) and answers `unclear` whenever the image does not support a call.
4. Aggregate by project and ward, requiring multiple independent reports before anything is shown publicly.
5. Show agreement or disagreement with the official record, with the photos and timestamps beside it.

**Controls.** Consent and EXIF stripping, face and number-plate blurring, no photographs of private property by default, a visible limitations note, and review by a person before any "claim does not match" statement is published. Evaluate the rubric against a labelled photo set, and report agreement with human raters.

## 5. Budget Q&A and promise ledger (design)

- **Budget Q&A.** Index budget documents by page and table. Answers must quote the source page, say "not published" when the document is silent, and refuse otherwise. Test with a fixed question set in English, Marathi and Hindi, including questions with no answer.
- **Promise ledger.** Extract commitments (what, who, by when, how much) from budget speeches, manifestos and council minutes. Show the verbatim quote. Link each to the budget line, tenders and evidence. Status changes need a cited source, and an owner-of-record gets a right of reply.
- **Budget-to-tender reconciliation.** For each department: budgeted, tendered, awarded, paid. Large unspent budgets late in the year show lapse risk.

## 6. Alerts and access (design)

- Follow a ward, department, tender or firm and get a short neutral alert: "New ₹14 cr drain tender in F/North", "Deadline extended a third time".
- Offer WhatsApp, SMS and email, in English, Marathi and Hindi. Keep the language plain and non-accusatory.
- Rate-limit, and make every alert link to the source document.

## 7. Evaluation plan: how we would know it works

| Question | Method |
|---|---|
| Does extraction work? | Hand-label 200 real documents; report per-field precision and recall, and the unit-error rate |
| Do the screens find real problems? | Build a reference set from published audit findings, debarments and court or Information Commission cases; report precision@k and recall against it |
| Are scores calibrated? | Compare score bands with outcomes in the reference set; tune weights on one half and test on the other |
| Do false positives hurt? | Count flags that a domain expert judges benign, by signal, and drop or reweight weak signals |
| Does it change behaviour? | Track RTIs filed, replies received, tenders amended or re-opened, and time to correction in a pilot ward |

Until this evaluation exists, treat the scores as a prioritisation aid and never as findings.

## 8. Governance, ethics and legal

- **Indicators, not accusations.** The UI always shows the number, the rule and the innocent explanation. No names appear in public headlines without human review and a right of reply.
- **Data rights.** Use public portals within their terms, official exports, or RTI. Do not circumvent captchas or authentication. Ask the authorities for a data-sharing arrangement.
- **Privacy.** No personal data from citizens beyond what a report needs. Keep drafts and applicant details on the user's device (the RTI page does this).
- **Error correction.** A visible "report an error" route, a correction log, and a "last updated" date next to every number.
- **Independence.** The project states clearly that it is not an official service.
- **Defamation and bias.** Same rules and formats for every ward and every party. Document weights and thresholds publicly.

## 9. Adoption path

1. **Month 1.** One department (storm water drains or roads) and one ward. Pre-agree the data access route and a named contact.
2. **Month 2.** Extract and hand-verify ~300 real tenders. Publish the error rate and the first Risk Radar view for that ward, reviewed by the contact.
3. **Month 3.** Pilot the RTI copilot and alerts with a few resident groups. Measure replies and amendments.
4. **After.** Hand over the schema, code and runbook, with an OCDS feed, to a host organisation.

## 10. Honest limitations of this repository

- All Risk Radar figures come from **synthetic** data with planted patterns. Passing tests show the code detects those patterns, and say nothing about accuracy on real procurement.
- `pipeline/extract_tender.py` calls a model with a JSON-schema output config and server-side refusal fallback, but **has not been run against the live API** here. Its validator is tested offline.
- The twin's coastline is a hand-drawn approximation, and ward geometry is not yet included.
- Statutory references in the RTI drafts (Sections 4(1)(b), 6(1), 6(3), 7(6), 19) and the timelines should be checked against current state rules before use.
