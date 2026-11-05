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
        if random.random() < 0.55:  # concentration: favour big contractors
            fav = random.choices(CONTRACTORS, weights=CW)[0]
            if fav not in bidders:
                bidders[0] = fav
        ratios = [random.uniform(0.80, 1.06) for _ in bidders]
        if random.random() < 0.12:  # near-estimate clustering pattern
            ratios = [random.uniform(0.975, 0.999) for _ in bidders]
        win = min(range(len(bidders)), key=lambda i: ratios[i])
        ext = random.choices([0, 1, 2, 3], weights=[62, 22, 11, 5])[0]
        status = random.choices(["awarded", "open", "cancelled", "retendered"], weights=[72, 14, 8, 6])[0]
        close = pub + dt.timedelta(days=random.randint(14, 35) + ext * 10)
        rows.append({
            "tender_id": f"SYN-{short}-{n:04d}", "organisation": org, "org_short": short, "city": city,
            "category": cat, "title": f"{cat} work (synthetic #{n})",
            "estimated_cost_cr": est,
            "awarded_value_cr": round(est * ratios[win], 2) if status == "awarded" else None,
            "bidders": [{"name": b, "quoted_cr": round(est * r, 2)} for b, r in zip(bidders, ratios)],
            "awarded_to": bidders[win] if status == "awarded" else None,
            "published_on": pub.isoformat(), "closing_on": close.isoformat(),
            "extensions": ext, "status": status,
        })
out = pathlib.Path(__file__).resolve().parents[1] / "docs/data/tenders.sample.json"
out.write_text(json.dumps({"synthetic": True, "generated_by": "scripts/generate_sample_data.py",
                           "note": "Synthetic data for demonstration. Not real tenders.", "tenders": rows}, separators=(",", ":")))
print(len(rows), "tenders ->", out)
