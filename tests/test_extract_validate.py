import copy, importlib.util, pathlib, unittest

spec = importlib.util.spec_from_file_location("extract_tender", pathlib.Path(__file__).parent.parent / "pipeline/extract_tender.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

GOOD = {
    "is_tender_document": True, "document_type": "result", "tender_id": "T-1", "organisation": "Org", "title": "Road",
    "estimated_cost_cr": 2.0, "published_on": "2026-01-10", "closing_on": "2026-02-01", "awarded_to": "A",
    "awarded_value_cr": 1.8, "status": "awarded", "bidders": [{"name": "A", "quoted_cr": 1.8}], "corrigenda": [],
    "evidence": [{"field": "tender_id", "quote": "Tender No. T-1", "page": 1}],
}

class V(unittest.TestCase):
    def bad(self, **kw):
        r = copy.deepcopy(GOOD); r.update(kw); return m.validate(r)

    def test_good(self): self.assertEqual(m.validate(GOOD), [])
    def test_missing_key(self):
        r = copy.deepcopy(GOOD); del r["status"]; self.assertTrue(any("missing key" in p for p in m.validate(r)))
    def test_bad_date(self): self.assertTrue(any("ISO" in p for p in self.bad(published_on="10/01/2026")))
    def test_close_before_publish(self): self.assertTrue(any("before" in p for p in self.bad(closing_on="2025-12-01")))
    def test_unit_error(self): self.assertTrue(any("unit" in p for p in self.bad(awarded_value_cr=180.0)))
    def test_negative(self): self.assertTrue(self.bad(estimated_cost_cr=-1))
    def test_awarded_needs_winner(self): self.assertTrue(self.bad(awarded_to=None))
    def test_needs_evidence(self): self.assertTrue(any("evidence" in p for p in self.bad(evidence=[])))
    def test_non_tender_doc_ok(self):
        r = copy.deepcopy(GOOD); r.update(is_tender_document=False, tender_id=None, evidence=[], status=None, awarded_to=None, awarded_value_cr=None)
        self.assertEqual(m.validate(r), [])
    def test_schema_is_strict(self):
        self.assertFalse(m.SCHEMA["additionalProperties"])
        self.assertEqual(set(m.SCHEMA["required"]), set(m.SCHEMA["properties"]))

if __name__ == "__main__":
    unittest.main()
