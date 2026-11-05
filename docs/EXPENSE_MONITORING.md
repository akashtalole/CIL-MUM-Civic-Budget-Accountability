# Monitoring Mumbai's Civic Expenses: Tender-Driven Ideas and 3D Digital Twin

Companion to [`IDEAS.md`](../IDEAS.md). This document focuses on **monitoring expenditure through public tender data** and on a **Three.js 3D digital twin** of Mumbai.

---

## 1. What the sources actually offer

These notes come from inspecting the pages on 5 Nov 2026. Portals change, so re-verify before building.

### 1.1 Maharashtra eProcurement (mahatenders.gov.in, NIC GePNIC platform)

Page: `FrontEndTendersByOrganisation`

| Observation | Implication |
|---|---|
| The organisation list is public and shows a **tender count** per organisation (173 organisations at the time of inspection). | You can track *volume of tendering* per body without any login. |
| Listing the tenders of an organisation requires a **captcha**. | Do not bypass it. Automated scraping against a captcha is likely against the portal's terms. Use the sanctioned routes in section 5. |
| The portal also exposes **Active Tenders, Tenders by Closing Date, Corrigendum, Results of Tenders, MIS Reports, Tenders by Location, Tenders by Classification, Tenders in Archive, Tenders Status, Cancelled/Retendered, Debarment List**. | These map directly onto monitoring signals (see section 3). |
| An announcement notes an **application fee of ₹500 per bid** from 15 Aug 2024, and a payment-timing advisory. | Bid fees are a cost signal that can affect small-bidder participation. |

**Mumbai-relevant organisations seen in the list (tender counts at inspection time)**

| Organisation | Tenders |
|---|---|
| Municipal Corporation of Greater Mumbai | 334 |
| Public Works Region | 215 |
| Navi Mumbai Municipal Corporation | 196 |
| Co-operation, Marketing and Textiles Dept, Mumbai | 127 |
| Public Works Department Mantralaya | 91 |
| Thane Municipal Corporation | 72 |
| BEST (Brihanmumbai Electric Supply and Transport) | 31 |
| Maharashtra Medical Goods Procurement Authority Mumbai | 24 |
| Director Medical Education and Research Dept Mumbai | 20 |
| Commissionerate of Fisheries, Mumbai | 19 |
| Director General of Police, Mumbai | 16 |
| Mumbai Metropolitan Region Development Authority | 15 |
| Maharashtra Metro Rail Corporation Limited | 15 |
| Directorate of Health Services, Mumbai | 13 |
| Maharashtra Airport Development Co. Ltd. | 11 |
| CE Water Resources Dept, Konkan Region Mumbai | 10 |
| Maharashtra Maritime Board Mumbai | 9 |
| Member Secretary (WSSD), Mumbai | 8 |
| CE (Electrical) Hydro Electric Projects Mumbai | 4 |
| Collector Mumbai City | 2 |
| Bombay High Court | 1 |

A "Mumbai watchlist" of these organisations covers the BMC, state works, transport, health procurement, metro and regional development.

### 1.2 MCGM / BMC portal (portal.mcgm.gov.in)

| Observation | Implication |
|---|---|
| It is an **SAP NetWeaver portal**. A plain HTTP request returned only an "iView not compatible" message. It rendered correctly in a real (headless) browser. | Any collector needs a browser-based approach and must respect the site's terms and rate limits. |
| The **Tenders and Quotations** page (`qletenders_new`) carries department notices and links to documents under `/irj/go/km/docs/documents/...` (PDFs). | Tender notices and corrigenda are often **PDFs** → a strong fit for Claude document extraction. |
| The home page links a **SWD Desilting Dashboard** for 2025-26 and 2026-27 (`swd.mcgm.gov.in/WMS2025`, `WMS2026`). | BMC already publishes desilting progress. This is a ready-made source for a pre-monsoon audit. |
| Notices mention the **CPWM Portal** and **PI Portal** (scheduled maintenance announced). | These are likely the works-management and project-information systems. Worth asking BMC about official data access. |
| Estate Department notices include tender-date extensions. | Extensions are a monitorable signal. |

> Both portals are authoritative sources. This project should treat them as **inputs to cross-check**, and should not present itself as an official BMC or state service.

---

## 2. Principles for monitoring

1. **Use sanctioned access.** Prefer official exports, MIS reports, RTI, open-data requests, or a data-sharing request to the BMC and NIC. Don't circumvent captchas or authentication.
2. **Cite the source.** Link each record to its tender ID and document.
3. **Indicators, not accusations.** Use language like "worth a closer look".
4. **Explain every flag** with the raw numbers behind it.
5. **Version the data.** Keep snapshots so changes (extensions, corrigenda, cancellations) are visible over time.

---

## 3. Monitoring ideas driven by tender data

Each idea lists the signal, the data needed, and how Claude helps.

### 3.1 Tender Lifecycle Timeline

**Signal:** Every tender passes through stages: notice → corrigenda → bid opening → award/result → work order → completion.
**What to build:** One timeline page per tender, with delays and gaps highlighted.
**Claude:** Extracts dates, values and conditions from notice and corrigendum PDFs, and writes a plain-language summary.
**Flag:** Stages missing after N days (for example no published result).

### 3.2 Corrigendum Tracker ("what changed after publication?")

**Signal:** Tenders amended after publication (date extensions, scope or eligibility changes).
**Build:** A diff view between the original notice and each corrigendum.
**Claude:** Compares two documents and explains the substantive changes ("eligibility turnover threshold raised from X to Y").
**Flag:** Repeated extensions, or eligibility changes made late.

### 3.3 Estimate vs Award Gap

**Signal:** Awarded value relative to the estimated cost.
**Build:** Distribution chart per department and contractor; highlight outliers.
**Flag:** Bids clustered just under the estimate, or large post-award escalation.

### 3.4 Competition Index

**Signal:** Number of bidders and number of *distinct* bidders over time.
**Flag:** Single-bidder tenders; the same small set of bidders repeatedly meeting.
**Output:** A "competition score" per department and per ward.

### 3.5 Contractor Concentration Map

**Signal:** Share of award value won by each contractor in each department or ward.
**Build:** Network and treemap of contractors vs departments.
**Flag:** High concentration, or repeated wins following cancellation and re-tendering.

### 3.6 Cancelled / Re-tendered Monitor

**Signal:** Tenders cancelled and re-issued (the portal has a dedicated listing).
**Flag:** Same scope re-tendered several times; re-tender at a higher estimate.

### 3.7 Contract Splitting Detector

**Signal:** Several small tenders for the same work, same area, same period, each just below an approval threshold.
**Claude:** Groups tenders by semantic similarity of scope and location.
**Flag:** A cluster of near-identical works that together exceed a threshold.

### 3.8 Seasonal Spend Pattern

**Signal:** Spending and tender volume by month, compared with the monsoon calendar.
**Flag:** Pre-monsoon works (drain desilting, road repair) tendered or awarded too late to matter, and a spike of March year-end awards.

### 3.9 Budget-to-Tender Reconciliation

**Signal:** Budget line vs tenders actually issued against it.
**Build:** For each department, "budgeted ₹X, tendered ₹Y, awarded ₹Z, paid ₹W".
**Flag:** Large budget with no tenders late in the year (lapse risk), or tenders exceeding the budget line.

### 3.10 Desilting Claim Cross-check

**Signal:** BMC's SWD Desilting Dashboard progress vs citizen photos, flood complaints, and rainfall.
**Claude:** Vision on citizen photos of drains and nullahs; text summary per ward.
**Flag:** Claims of 100% completion where waterlogging complaints persist.

### 3.11 Department "Spending Pulse" Dashboard

**Signal:** Weekly count and value of new tenders, awards and extensions per organisation, compared with the previous year.
**Why:** A cheap, always-on summary for journalists and councillors.

### 3.12 Watchlist Alerts (WhatsApp / email)

**Build:** Citizens follow a ward, a department or a contractor and receive alerts: "New ₹14 cr drain tender in your ward", "Tender extended a third time".
**Claude:** Writes a short, neutral alert in the user's language.

### 3.13 RTI Follow-up Generator

**Signal:** Any flag above.
**Claude:** Drafts an RTI application specific to the tender ID, asking for exactly the missing documents (work order, measurement book entries, completion certificate).
**Why:** Turns an indicator into a verifiable fact.

### 3.14 Cost-per-Unit Benchmarks

**Signal:** Rate per kilometre of road, per tonne of silt, per bed refurbished.
**Claude:** Extracts quantities and rates from bills of quantities in tender documents.
**Flag:** Large rate differences for comparable work (shown with caveats).

---

## 4. The 3D Digital Twin of Mumbai (Three.js)

A working prototype lives in [`docs/twin/index.html`](twin/index.html).

### 4.1 What it shows

- A 3D scene of Mumbai (schematic outline), with orbit, pan and zoom.
- **Civic projects** as bars: height = sanctioned amount, colour = status (on track, delayed, flagged), solid fill = share paid.
- **Public hospitals**, the **Mithi river**, **flood hotspots** (pulsing rings) and **landmarks**.
- Layer toggles, a status filter, hover tooltips and a click-through detail panel with the flags and the source.

### 4.2 Run it

```bash
cd docs
python3 -m http.server 8000
# open http://localhost:8000 (site home), /analytics.html, /twin/
```

It loads Three.js `0.160.0` from a CDN (import map), so it needs internet access and no build step.

### 4.3 Honest limitations

- The **coastline is a hand-drawn approximation**, and ward geometry is not yet included.
- The **project data is synthetic**. The panel and the page footer say so.
- Coordinates for hospitals, flood spots and landmarks are approximate.

### 4.4 Plugging in real data

The page loads an optional `docs/twin/data/projects.json`. If present and non-empty it replaces the demo data.

```json
[
  {
    "id": "MCGM-2026-00123",
    "title": "Stormwater drain desilting, Hindmata",
    "dept": "SWD",
    "ward": "F/North",
    "lat": 18.986, "lon": 72.841,
    "sanctioned_cr": 12.4,
    "paid_cr": 7.1,
    "status": "delayed",
    "due": "2026-05-31",
    "flags": ["Deadline extended twice"],
    "source": "https://… (tender notice URL)"
  }
]
```

`status` is one of `on-track`, `delayed`, `flagged`. Amounts are in ₹ crore.

### 4.5 Roadmap: from prototype to real digital twin

| Step | Upgrade | Notes |
|---|---|---|
| 1 | **Real ward boundaries** (GeoJSON, 24 wards) extruded and coloured by spend per capita | Use an official or open-licensed boundary source |
| 2 | **Real buildings and roads** via OpenStreetMap-derived 3D tiles or glTF/GeoJSON, with MapLibre or deck.gl + Three.js | Keeps the scene light |
| 3 | **Time slider** to replay tender awards, spend and completion over months | Animate bars by date |
| 4 | **Monsoon mode**: rain particles, rising water level, hotspot severity from rainfall + complaints | Strong demo for 3.10 |
| 5 | **Live feed**: nightly job writes `projects.json` from verified tender data | See section 5 |
| 6 | **"Ask the city" panel**: Claude answers questions about the visible projects, with citations to tender IDs | Grounded retrieval only |
| 7 | **Citizen evidence layer**: geotagged photos attached to projects, with a Claude-generated condition summary | Consent and privacy rules apply |
| 8 | **Asset layer**: drains, pumping stations, hospitals and schools with maintenance history | Needs official asset data |

---

## 5. Data pipeline (sanctioned routes)

```
 Official sources                     Processing                         Outputs
 ─────────────────                    ──────────                         ───────
 mahatenders MIS reports / exports ┐
 BMC tender notices (PDF)          ├─► snapshot store ─► Claude extraction ─► validated JSON ─► DB
 SWD desilting dashboard           │   (dated copies)    (schema-checked)      (tenders,        │
 Budget documents                  │                                            awards, flags)   ├─► Digital twin
 RTI replies / audit reports       ┘                                                             ├─► Alerts
                                                                                                 └─► Dashboards
```

**Ways to get data without breaking the rules**

1. **Ask for it.** Request a periodic data export or API access from BMC IT, the state eProcurement cell or NIC. Position it as a transparency pilot.
2. **MIS Reports and public listings** on the portals, used manually or via exports the portal offers.
3. **RTI** for bulk lists (all tenders above a value in a period, with awardee and value).
4. **Documents already published** as PDFs (notices, results, corrigenda), which Claude can parse.
5. **Hackathon day:** pre-collect a small sample by hand, label it as a sample, and build on that.

**Extraction schema (tender)**

```json
{
  "tender_id": "string",
  "organisation": "string",
  "department": "string",
  "title": "string",
  "location": "string | null",
  "estimated_cost": "number | null",
  "published_on": "date",
  "closing_on": "date",
  "corrigenda": [{ "date": "date", "summary": "string" }],
  "bidders": [{ "name": "string", "quoted": "number | null" }],
  "awarded_to": "string | null",
  "awarded_value": "number | null",
  "status": "open | closed | awarded | cancelled | retendered",
  "source_url": "string",
  "source_page": "number | null"
}
```

Claude should return this as strict JSON, with `null` where the document is silent. Never infer a missing value.

---

## 6. Risk indicators (definitions)

| Indicator | Definition | Caveat |
|---|---|---|
| Single bidder | Only one valid bid | Can be legitimate for specialised works |
| Near-estimate clustering | Bids within a small band below the estimate | Estimates may be rate-schedule based, so similar bids are plausible |
| Repeated extension | Closing date extended ≥ 2 times | Often administrative |
| Cost escalation | Final value more than X% above award | Scope changes may justify it |
| Concentration | One contractor > Y% of a department's awards | Depends on the market size |
| Splitting cluster | ≥ N similar works in the same area just below a threshold | Needs scope review |
| Late pre-monsoon award | Drain or road work awarded after a cut-off date | Check against the monsoon calendar |

Always show the numbers and the caveat next to the flag.

---

## 7. Hackathon plan using this material

| Hour | Task |
|---|---|
| 0-1 | Pick 1 department (SWD or Roads) and 1 ward. Pre-collect ~30 tenders (manual or RTI sample). |
| 1-3 | Claude extraction to the schema; manual spot-check of 10 records. |
| 3-4 | Compute 3-4 indicators (competition, extension, estimate gap, concentration). |
| 4-5 | Feed `projects.json` into the digital twin; verify colours and flags. |
| 5-6 | Add an "Ask about this project" box and an RTI draft button. |
| 6-7 | Demo script and backup video. |

**Demo story:** "Open the city. Click a flagged drain project. See that the deadline was extended twice and only one bidder applied. Click *Draft RTI* and get a file-ready application in 10 seconds."

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Terms-of-use or legal exposure from scraping | Use official exports, RTI, manual samples, or a formal data request |
| False flags damage reputations | Neutral wording, show the raw numbers, offer a "report an error" route |
| Geometry or data errors in the twin | Label schematic layers, version the data, show the source for every project |
| Stale data | Show "last updated" next to every number |
| Data privacy (citizen photos) | Consent, EXIF stripping, retention limits |
| Over-claiming | Present as a transparency aid that points to documents, not as an audit |

---

## 9. Open questions to ask BMC / state officials

1. Is there a bulk or API export of tender, award and work-order data (CPWM or the e-tendering system)?
2. Can ward-level project information from the PI Portal be published under an open licence?
3. Which fields are mandatory in the award record (bidders, quoted rates, completion dates)?
4. Is there an official ward boundary dataset that can be used with attribution?
5. Would BMC pilot a public "project tracker" for one ward or one department?
