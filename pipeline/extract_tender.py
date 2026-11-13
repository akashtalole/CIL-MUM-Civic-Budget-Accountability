#!/usr/bin/env python3
"""Extract structured tender records from tender-notice / result / corrigendum PDFs with Claude.

Usage:
    export ANTHROPIC_API_KEY=...            # or log in with `ant auth login`
    python pipeline/extract_tender.py notices/*.pdf --out data/extracted.jsonl

Design rules (see docs/ADVANCED.md):
  * strict JSON schema, `null` when a document is silent. Never infer a missing value.
  * every record keeps the source file and a short verbatim quote per key field, so a human can verify.
  * output is validated again locally. Records that fail go to <out>.rejects.jsonl, never to the dashboard.
  * a human reviews a sample before any record is published.
"""
from __future__ import annotations

import argparse
import base64
import json
import pathlib
import sys
from typing import Any

MODEL = "claude-opus-5-5"  # best extraction accuracy; set EXTRACT_MODEL to override
STATUSES = ["open", "closed", "awarded", "cancelled", "retendered"]

SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["is_tender_document", "document_type", "tender_id", "organisation", "title", "estimated_cost_cr",
                 "published_on", "closing_on", "awarded_to", "awarded_value_cr", "status", "bidders",
                 "corrigenda", "evidence"],
    "properties": {
        "is_tender_document": {"type": "boolean"},
        "document_type": {"type": "string", "enum": ["notice", "corrigendum", "result", "work_order", "other"]},
        "tender_id": {"type": ["string", "null"]},
        "organisation": {"type": ["string", "null"]},
        "title": {"type": ["string", "null"]},
        "estimated_cost_cr": {"type": ["number", "null"], "description": "Rupees crore. Convert from lakh or rupees only if the document states the unit."},
        "published_on": {"type": ["string", "null"], "description": "ISO date YYYY-MM-DD"},
        "closing_on": {"type": ["string", "null"], "description": "ISO date YYYY-MM-DD"},
        "awarded_to": {"type": ["string", "null"]},
        "awarded_value_cr": {"type": ["number", "null"]},
        "status": {"type": ["string", "null"], "enum": STATUSES + [None]},
        "bidders": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                    "required": ["name", "quoted_cr"], "properties": {"name": {"type": "string"}, "quoted_cr": {"type": ["number", "null"]}}}},
        "corrigenda": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                       "required": ["date", "summary"], "properties": {"date": {"type": ["string", "null"]}, "summary": {"type": "string"}}}},
        "evidence": {"type": "array", "description": "Short verbatim quotes supporting the key fields, with page numbers.",
                     "items": {"type": "object", "additionalProperties": False, "required": ["field", "quote", "page"],
                               "properties": {"field": {"type": "string"}, "quote": {"type": "string"}, "page": {"type": ["integer", "null"]}}}},
    },
}

SYSTEM = (
    "You extract structured data from Indian public-procurement documents (tender notices, corrigenda, "
    "results, work orders), which may be in English, Marathi or Hindi.\n"
    "Rules: copy facts only from the document. If a field is not stated, return null (or an empty array). "
    "Never guess, calculate a missing value, or fill from background knowledge. Keep amounts in rupees crore "
    "only when the document states the unit (lakh = 0.01 crore; rupees = 1e-7 crore). Dates are ISO YYYY-MM-DD. "
    "For each key field you fill, add an evidence entry with a short verbatim quote and the page. "
    "If the document is not a procurement document, set is_tender_document to false and leave the rest null."
)


def validate(rec: dict[str, Any]) -> list[str]:
    """Local, model-independent checks. Returns a list of problems (empty = ok)."""
    problems: list[str] = []
    if not isinstance(rec, dict):
        return ["record is not an object"]
    for k in SCHEMA["required"]:
        if k not in rec:
            problems.append(f"missing key: {k}")
    if rec.get("is_tender_document") and not rec.get("tender_id"):
        problems.append("tender document without tender_id")
    for k in ("estimated_cost_cr", "awarded_value_cr"):
        v = rec.get(k)
        if v is not None and (not isinstance(v, (int, float)) or isinstance(v, bool) or v < 0):
            problems.append(f"{k} must be a non-negative number or null")
    for k in ("published_on", "closing_on"):
        v = rec.get(k)
        if v is not None:
            try:
                import datetime as dt
                dt.date.fromisoformat(v)
            except (TypeError, ValueError):
                problems.append(f"{k} is not an ISO date: {v!r}")
    if rec.get("published_on") and rec.get("closing_on") and rec["closing_on"] < rec["published_on"]:
        problems.append("closing_on is before published_on")
    if rec.get("status") not in STATUSES + [None]:
        problems.append(f"bad status: {rec.get('status')!r}")
    if rec.get("status") == "awarded" and not rec.get("awarded_to"):
        problems.append("status awarded but awarded_to is empty")
    if rec.get("awarded_value_cr") is not None and rec.get("estimated_cost_cr"):
        ratio = rec["awarded_value_cr"] / rec["estimated_cost_cr"]
        if ratio > 3 or ratio < 0.2:  # most likely a unit mix-up (lakh vs crore)
            problems.append(f"award/estimate ratio {ratio:.2f} looks like a unit error")
    for b in rec.get("bidders") or []:
        if not b.get("name"):
            problems.append("bidder without a name")
    if rec.get("is_tender_document") and not rec.get("evidence"):
        problems.append("no evidence quotes supplied")
    return problems


def extract_one(client: Any, pdf: pathlib.Path) -> dict[str, Any]:
    """Send one PDF to Claude and return the parsed record. Raises on refusal or invalid JSON."""
    data = base64.standard_b64encode(pdf.read_bytes()).decode("ascii")
    # Server-side refusal fallback is enabled by default (beta endpoint, `fallbacks: "default"`).
    resp = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM,
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[{"role": "user", "content": [
            {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": data}},
            {"type": "text", "text": "Extract the record from this document."},
        ]}],
    )
    if resp.stop_reason == "refusal":
        raise RuntimeError(f"refused: {getattr(resp, 'stop_details', None)}")
    if resp.stop_reason == "max_tokens":
        raise RuntimeError("output truncated (max_tokens)")
    text = next((b.text for b in resp.content if b.type == "text"), None)
    if text is None:
        raise RuntimeError("no text block in response")
    return json.loads(text)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdfs", nargs="+", type=pathlib.Path)
    ap.add_argument("--out", type=pathlib.Path, default=pathlib.Path("extracted.jsonl"))
    args = ap.parse_args(argv)

    import os
    global MODEL
    MODEL = os.environ.get("EXTRACT_MODEL", MODEL)
    import anthropic  # imported late so `validate` can be used and tested without the SDK
    client = anthropic.Anthropic()

    rejects = args.out.with_suffix(".rejects.jsonl")
    ok = bad = 0
    with args.out.open("a") as good, rejects.open("a") as rej:
        for pdf in args.pdfs:
            try:
                rec = extract_one(client, pdf)
                rec["source_file"] = pdf.name
                problems = validate(rec)
            except Exception as e:  # keep going; one bad PDF must not stop a batch
                rec, problems = {"source_file": pdf.name}, [f"{type(e).__name__}: {e}"]
            if problems:
                bad += 1
                rej.write(json.dumps({"source_file": pdf.name, "problems": problems, "record": rec}, ensure_ascii=False) + "\n")
            else:
                ok += 1
                good.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"{ok} accepted, {bad} rejected -> {args.out}, {rejects}")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
