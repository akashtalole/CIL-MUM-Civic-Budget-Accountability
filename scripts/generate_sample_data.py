#!/usr/bin/env python3
"""Generate SYNTHETIC tender data for the analytics demo (docs/data/tenders.sample.json).

Nothing here is real BMC/MMR data. It follows the schema in docs/EXPENSE_MONITORING.md so
real, verified data can replace the file without changing the dashboard.
"""
import json, random, datetime as dt, pathlib

random.seed(2026)
ORGS = {  # organisation: (weight, short, city)
    "Municipal Corporation of Greater Mumbai": (334, "MCGM", "Mumbai"),
    "Navi Mumbai Municipal Corporation": (196, "NMMC", "Navi Mumbai"),
    "Thane Municipal Corporation": (72, "TMC", "Thane"),
    "Brihanmumbai Electric Supply and Transport Undertaking": (31, "BEST", "Mumbai"),
    "Kalyan Dombivli Municipal Corporation": (30, "KDMC", "Kalyan-Dombivli"),
    "Mira Bhaindar Municipal Corporation": (27, "MBMC", "Mira-Bhayandar"),
    "Panvel Municipal Corporation": (23, "PMC-Panvel", "Panvel"),
    "Mumbai Metropolitan Region Development Authority": (15, "MMRDA", "MMR"),
    "Maharashtra Metro Rail Corporation Limited": (15, "MahaMetro", "MMR"),
    "Bhiwandi Nizampur City Municipal Corporation": (14, "BNCMC", "Bhiwandi"),
}
CATS = {
    "Roads": (3, 8, 60), "Drains (SWD)": (3, 6, 40), "Water supply": (2, 5, 50),
    "Health": (2, 3, 25), "Education": (1, 2, 10), "Buildings": (2, 5, 35),
    "Electrical": (1, 3, 20), "Transport": (1, 4, 45),
}  # category: (weight, min cr, max cr)
CONTRACTORS = [f"Contractor {c}" for c in "ABCDEFGHIJKLMNOPQRST"]
CW = [14, 11, 9, 8, 7, 6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1]

def pick(d):
    return random.choices(list(d), weights=[v[0] for v in d.values()])[0]

WARDS = ["A", "C", "D", "E", "F/S", "F/N", "G/S", "G/N", "H/E", "H/W", "K/E", "K/W", "L", "M/E", "N", "P/N", "R/C", "S", "T"]
RING = ["Contractor Q", "Contractor R", "Contractor S"]  # planted co-bidding ring (synthetic)
rows, n = [], 0
for org, (w, short, city) in ORGS.items():
    for _ in range(max(12, round(w * 1.6))):
        n += 1
        cat = pick(CATS)
        lo, hi = CATS[cat][1], CATS[cat][2]
        est = round(random.lognormvariate(1.4, 0.9) * (lo / 3), 2)
        est = min(max(est, 0.2), hi * 1.5)
        pub = dt.date(2025, 4, 1) + dt.timedelta(days=random.randint(0, 570))
        nb = random.choices([1, 2, 3, 4, 5, 6], weights=[13, 22, 25, 18, 12, 10])[0]
        bidders = random.sample(CONTRACTORS, k=nb)
        ring = random.random() < 0.07 and nb >= 3
        if ring:  # planted cover-bidding pattern: ring members bid together with tight spacing, rotating winner
            bidders = RING[:] + [b for b in bidders if b not in RING][: max(0, nb - 3)]
        if random.random() < 0.55 and not ring:  # concentration: favour big contractors
            fav = random.choices(CONTRACTORS, weights=CW)[0]
            if fav not in bidders:
                bidders[0] = fav
        ratios = [random.uniform(0.80, 1.06) for _ in bidders]
        if random.random() < 0.12:  # near-estimate clustering pattern
            ratios = [random.uniform(0.975, 0.999) for _ in bidders]
        if ring:
            base = random.uniform(0.93, 0.99)
            ratios = [base + 0.004 * i + random.uniform(0, 0.002) for i in range(len(bidders))]
            rot = random.randrange(3)
            ratios[rot] = min(ratios) - 0.01  # rotating winner among ring members
        win = min(range(len(bidders)), key=lambda i: ratios[i])
        ext = random.choices([0, 1, 2, 3], weights=[62, 22, 11, 5])[0]
        status = random.choices(["awarded", "open", "cancelled", "retendered"], weights=[72, 14, 8, 6])[0]
        close = pub + dt.timedelta(days=random.randint(14, 35) + ext * 10)
        rows.append({
            "tender_id": f"SYN-{short}-{n:04d}", "organisation": org, "org_short": short, "city": city,
            "ward": random.choice(WARDS) if city == "Mumbai" else None,
            "category": cat, "title": f"{cat} work (synthetic #{n})",
            "estimated_cost_cr": est,
            "awarded_value_cr": round(est * ratios[win], 2) if status == "awarded" else None,
            "bidders": [{"name": b, "quoted_cr": round(est * r, 2)} for b, r in zip(bidders, ratios)],
            "awarded_to": bidders[win] if status == "awarded" else None,
            "published_on": pub.isoformat(), "closing_on": close.isoformat(),
            "extensions": ext, "status": status,
        })
# planted contract-splitting clusters: several similar works, same org/category/ward, same fortnight, each just under an illustrative threshold
THRESHOLD = 3.0
for k in range(6):
    org = random.choice(["Municipal Corporation of Greater Mumbai", "Thane Municipal Corporation", "Navi Mumbai Municipal Corporation"])
    short, city = ORGS[org][1], ORGS[org][2]
    ward = random.choice(WARDS) if city == "Mumbai" else None
    cat = random.choice(["Roads", "Drains (SWD)", "Buildings"])
    start = dt.date(2025, 6, 1) + dt.timedelta(days=random.randint(0, 420))
    contractor = random.choice(CONTRACTORS[:6])
    for j in range(random.randint(3, 5)):
        n += 1
        est = round(random.uniform(0.88, 0.99) * THRESHOLD, 2)
        pub = start + dt.timedelta(days=random.randint(0, 10))
        others = random.sample([c for c in CONTRACTORS if c != contractor], k=random.randint(0, 2))
        names = [contractor] + others
        ratios = [random.uniform(0.9, 0.99)] + [random.uniform(0.95, 1.05) for _ in others]
        rows.append({
            "tender_id": f"SYN-{short}-{n:04d}", "organisation": org, "org_short": short, "city": city, "ward": ward,
            "category": cat, "title": f"{cat} work (synthetic #{n})", "estimated_cost_cr": est,
            "awarded_value_cr": round(est * ratios[0], 2),
            "bidders": [{"name": b, "quoted_cr": round(est * r, 2)} for b, r in zip(names, ratios)],
            "awarded_to": contractor, "published_on": pub.isoformat(),
            "closing_on": (pub + dt.timedelta(days=21)).isoformat(), "extensions": 0, "status": "awarded",
        })

out = pathlib.Path(__file__).resolve().parents[1] / "docs/data/tenders.sample.json"
out.write_text(json.dumps({"synthetic": True, "generated_by": "scripts/generate_sample_data.py",
                           "note": "Synthetic data for demonstration. Not real tenders.", "tenders": rows}, separators=(",", ":")))
print(len(rows), "tenders ->", out)
