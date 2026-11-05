# Claude Impact Lab Mumbai: Civic Budget & Accountability

Ideas, build plans and adoption strategy for the Claude Impact Lab Mumbai.

> **Challenge:** Build working solutions that help citizens (1) **see** where public money is spent, (2) **track** whether civic promises are delivered, and (3) **hold** the right systems and people accountable.

---

## Table of Contents

1. [Context and Problem](#1-context-and-problem)
2. [Design Principles](#2-design-principles)
3. [Data Landscape](#3-data-landscape)
4. [Ideas: Pillar 1, See the Money](#4-pillar-1-see-where-the-money-goes)
5. [Ideas: Pillar 2, Track Promises](#5-pillar-2-track-whether-promises-are-delivered)
6. [Ideas: Pillar 3, Hold to Account](#6-pillar-3-hold-systems-and-people-accountable)
7. [Cross-cutting Ideas](#7-cross-cutting-ideas)
8. [Comparison and Shortlist](#8-comparison-and-shortlist)
9. [One-Day Build Plan](#9-one-day-build-plan)
10. [Reference Architecture](#10-reference-architecture)
11. [Adoption Strategy](#11-adoption-strategy-getting-to-civic-authorities)
12. [Risks, Ethics and Legal](#12-risks-ethics-and-legal-considerations)
13. [Team Roles](#13-suggested-team-composition)
14. [Pitch Outline](#14-pitch-outline-5-minutes)
15. [Pre-event Checklist](#15-pre-event-checklist)

---

## 1. Context and Problem

Every year, crores of rupees are allocated to Mumbai's roads, drains, hospitals and schools. Citizens rarely learn where the money went or whether the promised work happened.

**Why the information gap exists**

| Gap | What it looks like |
|---|---|
| Format | Budgets and tenders are long PDFs, scanned tables and mixed-language documents |
| Fragmentation | Budget, tender, work order, payment and complaint data live in separate systems |
| Granularity | Data is reported by department or in aggregate, not by ward or street |
| Follow-through | Promises are made in speeches and manifestos with no tracker |
| Escalation | Citizens don't know who is responsible, or what to do when a complaint is closed without action |

**Where Claude helps most:** reading messy documents, structuring them, explaining them in plain language and multiple languages, drafting legal and administrative text, and reasoning over images and text together.

---

## 2. Design Principles

1. **Cite everything.** Every number links to its source document and page. Officials and journalists must be able to verify it.
2. **Non-adversarial framing.** "Helping the BMC be transparent" is adoptable. "Exposing the BMC" is not.
3. **Public data only.** Use budgets, tenders, RTI replies, audit reports and citizen-submitted evidence.
4. **Risk indicators, not accusations.** Flag anomalies, never allege corruption.
5. **Meet citizens where they are.** WhatsApp, voice, Marathi, Hindi and low bandwidth beat a polished desktop dashboard.
6. **Depth over breadth.** A working demo on one ward is better than a promise to cover 24.
7. **Human in the loop.** Claude drafts and explains. Humans decide and file.

---

## 3. Data Landscape

> Verify each source's availability, format and terms before the event. URLs and portals change.

| Data | Likely source | Format | Notes |
|---|---|---|---|
| Municipal budget (MCGM/BMC) | BMC website, budget speeches | PDF | Revenue and capital expenditure; department and sometimes ward breakdowns |
| Tenders | BMC e-tendering, Maharashtra eProcurement portal | HTML / PDF | Contractor, estimate, award value, dates |
| Work orders / completion | Tender portals, RTI replies | PDF | Often incomplete, so RTI helps fill the gap |
| Complaints | BMC grievance channels, MyBMC apps, 1916, CPGRAMS, Aaple Sarkar | Mixed | Check for public or exportable data |
| Audit reports | CAG, internal audit, civil-society reports (e.g. Praja Foundation) | PDF | Useful for the "was the finding fixed?" tracking |
| Council minutes / resolutions | BMC corporation and committee records | PDF | Source for promises and decisions |
| Ward boundaries | Public GIS/open-data sources | GeoJSON / shapefile | Needed to map pincode to ward |
| Rainfall / flooding | IMD, BMC disaster management | CSV / API | For the monsoon-readiness ideas |
| Election manifestos | Party publications | PDF | Source for promise extraction |
| RTI replies | Citizen-submitted | PDF / scans | Can seed a public library |

**Practical advice:** Pre-download a small set (one budget year, 50–100 tenders, one audit report, two wards' worth of complaints) so the day is spent building, not scraping.

---

## 4. Pillar 1: See Where the Money Goes

### 4.1 Mera Ward Budget

**One-liner:** Enter a pincode or ward and see in plain language what was allocated and spent on your area.

- **User:** Any citizen, RWA member, journalist or student.
- **Flow:** Pincode → ward → department-wise allocation vs actual → plain-language explanation → "ask a question".
- **Claude's role:**
  - Extract structured tables from budget PDFs.
  - Explain terms ("capital expenditure", "revised estimate") in simple Marathi, Hindi and English.
  - Answer follow-ups with citations to the page.
- **Data:** BMC budget documents, ward map.
- **MVP (1 day):** One budget year, 3 departments (roads, drains/SWD, health), 2–3 wards.
- **Stretch:** Year-over-year comparison, per-capita spend, "similar wards" comparison.
- **Success metric:** A citizen finds their ward's drain budget in under 30 seconds.
- **Risk:** Ward-level data may not exist for all lines. Say "not published" explicitly rather than guessing.

### 4.2 Rupee Trail (Budget → Tender → Payment)

**One-liner:** Follow a single rupee from budget line to contractor to completion.

- **Flow:** Select a project → timeline of budget line, tender, award, work order, bills, completion → gaps highlighted.
- **Claude's role:** Extract fields (contractor, value, dates, scope) from heterogeneous PDFs; reconcile naming differences; summarize each project.
- **MVP:** 10–20 projects fully traced, built from hand-picked documents.
- **Stretch:** Auto-linking by project name and location using fuzzy matching.
- **Success metric:** For a given project, a user can see every stage, with the missing ones flagged.
- **Risk:** Joining datasets without a shared key. Expect partial coverage and say so.

### 4.3 Corporator Fund Tracker

**One-liner:** Where did each ward's local development fund go?

- **Claude's role:** Parse fund-utilisation statements; categorise spending (roads, lights, community halls); generate a plain-language ward summary.
- **MVP:** One or two wards, one year.
- **Success metric:** Resident can answer "what was done with our ward fund?" in one page.
- **Risk:** Politically sensitive. Present neutrally, with identical formats for every ward.

### 4.4 WhatsApp Budget Bot (Voice + Regional Languages)

**One-liner:** Ask by voice note in Marathi, Hindi or Hinglish; get a cited answer.

- **Claude's role:** Understand the query, retrieve the relevant budget passage, answer concisely with a citation and page reference.
- **Flow:** Voice or text → transcription → intent → retrieval over the budget corpus → answer plus "source: page X".
- **MVP:** Web chat or Telegram first. WhatsApp Business API setup can take time, so test early.
- **Success metric:** Correct, cited answers on a set of 20 test questions in 3 languages.
- **Risk:** Hallucinated numbers. Require retrieval-grounded answers and refuse when no source exists.

---

## 5. Pillar 2: Track Whether Promises Are Delivered

### 5.1 Promise Ledger

**One-liner:** A public scorecard of commitments: kept, delayed, broken.

- **Claude's role:**
  - Extract commitments (what, who, by when, how much) from budget speeches, manifestos, council minutes and press releases.
  - Deduplicate repeated promises across years.
  - Draft status updates from new evidence.
- **Data model:** `promise {id, text, source, date_made, owner, deadline, budget_ref, status, evidence[]}`.
- **MVP:** 30–50 promises from one budget speech, with manual status verification.
- **Stretch:** Auto-suggest status changes when new documents appear. Citizens can submit evidence.
- **Success metric:** Each promise shows its source quote, owner, deadline and evidence trail.
- **Risk:** Ambiguous promises. Show the exact quote and avoid paraphrased claims.

### 5.2 Ground-Truth Verification (Citizen Photos)

**One-liner:** Check "completed" work against what's visible on the street.

- **Flow:** Citizen uploads geotagged photo → Claude describes the condition (pothole, open drain, cracked surface) → compared against the official completion record → verdict plus confidence.
- **Claude's role:** Image understanding, structured condition report, plain-language summary.
- **MVP:** 20–30 sample photos, a simple rubric (done / partly done / not done / unclear).
- **Stretch:** Before/after comparison, aggregate maps by ward.
- **Success metric:** Rubric agreement with a human reviewer on a labelled sample.
- **Risk:** Photo manipulation, wrong location, poor lighting. Treat output as evidence-supporting, not conclusive, and use "unclear" liberally.

### 5.3 Monsoon Readiness Audit (Nullah Desilting)

**One-liner:** Compare pre-monsoon claims with what residents see and what floods.

- **Data:** Desilting targets and completion claims, citizen photos, rainfall, flooding or waterlogging complaints.
- **Claude's role:** Extract claims, cross-reference with complaints, produce ward-level readiness summaries.
- **MVP:** One monsoon season, a handful of known flood-prone spots.
- **Success metric:** A ranked list of wards where claims and ground reports diverge most, with evidence.
- **Why strong:** Recurring, visible, emotionally resonant and time-bound.

### 5.4 Pothole-to-Payment Linker

**One-liner:** If a road fails inside its warranty, the contractor should fix it at their own cost.

- **Flow:** Pothole report → locate road → find its contract and defect-liability period → if within warranty, generate a notice to the contractor and a record for the public tracker.
- **Claude's role:** Extract defect-liability terms from contract documents, draft the notice.
- **MVP:** A handful of roads with known contracts.
- **Risk:** Contract terms may not be public. Pair with an RTI request (see 6.1).

---

## 6. Pillar 3: Hold Systems and People Accountable

### 6.1 RTI Copilot

**One-liner:** Describe the problem, get a ready-to-file RTI and a tracker for the response.

- **Flow:**
  1. Citizen describes a problem in their own words and language.
  2. Claude identifies the public authority and PIO, and drafts precise, answerable questions.
  3. Citizen files (online portal or post).
  4. Tracker counts 30 days and drafts a first-appeal if the reply is missing or evasive.
  5. Replies go into an opt-in public library.
- **Why it's strong:** Highly feasible in a day, directly useful, and gets better with every reply collected.
- **MVP:** Drafting engine with 10 common templates (drains, potholes, hospital services, school facilities, tender details).
- **Stretch:** Reply analysis ("did they answer each question?"), first-appeal drafts, aggregate insights.
- **Success metric:** Drafts that a lawyer or RTI activist judges "file-ready" with minimal edits.
- **Risk:** Wrong authority or malformed questions. Include a human review step and cite the relevant provisions.

### 6.2 Grievance Escalation Engine

**One-liner:** Don't let a complaint die by being closed without action.

- **Flow:** Log complaint → track SLA → detect "closed without action" or timeout → escalate to the next officer → notify the elected representative → publish a response-time record.
- **Claude's role:** Classify the complaint, map to the right department and officer chain, draft escalation text, detect "resolved" claims that don't match the complaint.
- **MVP:** Simulated complaint data with a defined escalation ladder.
- **Success metric:** Time-to-correct-owner and number of re-opened false closures.
- **Risk:** Integration with official systems may not be possible, so start as citizen-side tooling.

### 6.3 Audit Report Decoder

**One-liner:** Turn dense audit reports into trackable findings.

- **Claude's role:** Extract findings, amounts, departments and recommendations; track "was it fixed?" by linking to later reports and replies.
- **MVP:** One audit report, 20–30 findings.
- **Stretch:** Journalist mode with "story leads" ranked by amount and recurrence.
- **Success metric:** Journalists find 3 verifiable leads in under 10 minutes.

### 6.4 Tender Anomaly Radar

**One-liner:** Statistical red flags in procurement, framed as risk indicators.

- **Indicators:** Repeat winners, single-bidder tenders, bids clustered just under estimate, repeated extensions and cost escalation, contract splitting around approval thresholds.
- **Claude's role:** Structure the tender data, explain each flag in plain language, suggest follow-up questions (and RTI drafts).
- **MVP:** 100–500 tenders, 4 indicators, explanation per flag.
- **Success metric:** Flags reviewed by a domain expert are judged reasonable.
- **Risk:** False positives harm reputations. Use the wording "worth a closer look", show the underlying numbers, and never name wrongdoing.

---

## 7. Cross-cutting Ideas

- **Open Civic Data Layer.** Many teams need the same cleaned budget, tender and ward data. Publish it as a shared, documented dataset.
- **Civic Budget in Schools.** A simple ward-budget teaching module for students.
- **Multilingual Explainer Cards.** Shareable one-image summaries (WhatsApp-ready) of a ward's budget.
- **Journalist Toolkit.** Bulk document Q&A with citation, for investigative workflows.
- **Accessibility layer.** Voice input and output, large text and low-bandwidth mode.

---

## 8. Comparison and Shortlist

| # | Idea | Pillar | Build effort | Demo impact | Adoption fit | Data risk |
|---|---|---|---|---|---|---|
| 4.1 | Mera Ward Budget | See | Medium | High | High | Medium |
| 4.2 | Rupee Trail | See | High | High | Medium | High |
| 4.3 | Corporator Fund Tracker | See | Low–Med | Medium | Medium | Medium |
| 4.4 | WhatsApp Budget Bot | See | Medium | High | High | Low |
| 5.1 | Promise Ledger | Track | Medium | High | High | Low |
| 5.2 | Ground-Truth Photos | Track | Medium | High | Medium | Low |
| 5.3 | Monsoon Readiness Audit | Track | Medium | High | Medium | Medium |
| 5.4 | Pothole-to-Payment | Track | Medium | Medium | Medium | High |
| 6.1 | RTI Copilot | Hold | Low–Med | High | High | Low |
| 6.2 | Grievance Escalation | Hold | Medium | Medium | Medium | Medium |
| 6.3 | Audit Report Decoder | Hold | Low–Med | Medium | High | Low |
| 6.4 | Tender Anomaly Radar | Hold | Medium | High | Low–Med | Medium |

**Recommended shortlist**

1. **RTI Copilot (6.1).** Most buildable, immediately useful, and fits the "hold accountable" pillar.
2. **Mera Ward Budget with a chat/WhatsApp front end (4.1 + 4.4).** The clearest "see the money" demo.
3. **Promise Ledger (5.1).** Strong narrative and a natural bridge to authorities.
4. **Monsoon Readiness Audit (5.3).** A high-emotion, high-visibility demo.

**Combination idea:** A single "Civic Companion" that combines 4.1 (see), 5.1 (track) and 6.1 (act). A citizen asks about their ward, sees the promise status and files an RTI with one tap. It is a more compelling story, but only attempt it if the team is large.

---

## 9. One-Day Build Plan

| Time | Activity |
|---|---|
| 0:00–0:45 | Briefing; pick one problem and one user; define the single demo moment |
| 0:45–1:30 | Team roles; data pull; repo setup |
| 1:30–3:30 | Data extraction and structuring with Claude; build the core flow |
| 3:30–5:00 | Front end (web or chat); citations and "not found" handling |
| 5:00–6:00 | Test with 15–20 realistic questions or cases; fix failures |
| 6:00–7:00 | Demo script; slides; backup recording |
| 7:00+ | Final demos |

**Rules of thumb**

- Decide the demo moment first, then build only what it needs.
- Hard-code the happy path for one ward if necessary, but be honest about it in the pitch.
- Record a backup demo video in case of network trouble.

---

## 10. Reference Architecture

```
 Citizen (Web / WhatsApp / Telegram / Voice)
                │
                ▼
        ┌───────────────┐
        │  App / Bot UI │
        └───────┬───────┘
                │
        ┌───────▼────────┐        ┌────────────────────┐
        │  Orchestrator  │◄──────►│  Claude (API)      │
        │  (API server)  │        │  - extraction      │
        └───┬─────────┬──┘        │  - Q&A w/ cite     │
            │         │           │  - drafting (RTI)  │
            │         │           │  - vision          │
            │         │           └────────────────────┘
   ┌────────▼──┐   ┌──▼───────────┐
   │ Document  │   │ Structured   │
   │ store +   │   │ DB (budget,  │
   │ search    │   │ tenders,     │
   │ (PDFs)    │   │ promises)    │
   └───────────┘   └──────────────┘
            ▲
            │  ingestion pipeline (PDF → text/tables → JSON, validated)
   BMC budget, tenders, audits, minutes, RTI replies
```

**Key technical notes**

- **Extraction:** Have Claude output strict JSON against a schema, validate it, and spot-check against the source page.
- **Q&A:** Retrieval-grounded answers; return the passage plus page; refuse if nothing relevant is found.
- **Languages:** Test Marathi, Hindi and Hinglish queries early, since quality varies by task.
- **Evaluation:** Build a small golden set (20–30 question/answer pairs with sources) and rerun it after each change.
- **Privacy:** Don't store citizen identity or photos longer than needed. Strip EXIF data you don't need.

---

## 11. Adoption Strategy (Getting to Civic Authorities)

The event states that the strongest solutions will be taken to civic authorities. Plan for that from the start.

1. **Name the buyer or owner.** Which BMC department or officer would own this (IT, Ward Office, Grievance Cell, Budget Department)?
2. **Make it easy to say yes.**
   - Runs on public data, with no integration required for a pilot.
   - Pilot scope of one ward or one department.
   - Free or low cost; open source if possible.
3. **Show benefit to the authority.**
   - Fewer repeat complaints and RTIs.
   - Better public trust and clearer communication.
   - Early warning on problem areas.
4. **Offer a handover path.** Documentation, a data schema and a maintenance plan.
5. **Lead with a success story.** "Ward X, three weeks, here is the result."
6. **Bring credibility.** Pair with a policy or legal expert, a civil-society partner or a recognised research group.

---

## 12. Risks, Ethics and Legal Considerations

| Risk | Mitigation |
|---|---|
| Hallucinated numbers | Retrieval-grounded answers, citation required, refuse when no source |
| Defamation / false accusation | "Risk indicator" language, show raw data, no allegations |
| Politically one-sided framing | Same format for every ward and party; neutral wording |
| Privacy of citizens and photos | Minimal data, consent, EXIF stripping, retention limits |
| Misuse of RTI automation | Human review before filing; rate limits |
| Data licensing / terms of use | Check portal terms; prefer officially published data |
| Language errors | Human review for official-facing text; test with native speakers |
| Over-reliance on AI | Make limitations visible; show "last updated" and source |

---

## 13. Suggested Team Composition

| Role | Responsibility |
|---|---|
| Developer (1–2) | Pipeline, API, front end |
| Data person | Cleaning, schema, evaluation set |
| Policy / legal | Authority mapping, RTI correctness, framing, adoption path |
| Designer | Citizen-first UX, multilingual layout, demo visuals |
| Journalist / researcher | Real questions, story value, verification |
| Presenter | Narrative, demo flow, authority-facing pitch |

You don't need to code to contribute. Domain knowledge of how a ward office or a tender actually works is often the scarcest skill.

---

## 14. Pitch Outline (5 Minutes)

1. **Hook (30s).** A real broken road or flooded street and the question "where did the money go?"
2. **Problem (45s).** Budgets exist, but citizens can't read, trace or act on them.
3. **Live demo (2 min).** One citizen, one question, one cited answer, one action (e.g. an RTI filed).
4. **How it works (45s).** Public data → Claude → verifiable output.
5. **Why authorities should adopt it (45s).** Pilot scope, low cost, benefit to them.
6. **Ask (15s).** "Give us one ward and 60 days."

---

## 15. Pre-event Checklist

- [ ] Choose 2–3 candidate ideas and one backup
- [ ] Download a small sample of budget PDFs, tenders and one audit report
- [ ] Get the ward map and a pincode-to-ward mapping
- [ ] Set up a repo, a Claude API key and a basic extraction script
- [ ] Draft the JSON schemas (budget line, tender, promise, RTI)
- [ ] Prepare 20–30 test questions with known answers
- [ ] Identify potential teammates (data, policy/legal, design)
- [ ] Read up on the RTI Act process and timelines
- [ ] Prepare a backup demo recording plan

---

*Note: Data sources, portals, and figures should be verified before the event. This document lists candidate sources and approaches, not confirmed datasets.*
