import json
from pathlib import Path
import unittest


class TestPosPageAliases(unittest.TestCase):
    def test_pos_page_alias_redirects_to_canonical_posapp_route(self):
        page_dir = Path(__file__).resolve().parent
        alias_dir = page_dir / "pos"
        self.assertTrue(alias_dir.exists(), "expected Desk page alias 'pos' to exist")

        page_definition_path = alias_dir / "pos.json"
        self.assertTrue(
            page_definition_path.exists(),
            "expected Desk page alias definition at pos/pos.json",
        )
        page_definition = json.loads(page_definition_path.read_text(encoding="utf-8"))
        self.assertEqual(page_definition.get("name"), "pos")
        self.assertEqual(page_definition.get("page_name"), "pos")

        page_script_path = alias_dir / "pos.js"
        self.assertTrue(
            page_script_path.exists(),
            "expected Desk page alias bootstrap at pos/pos.js",
        )
        page_script = page_script_path.read_text(encoding="utf-8")
        self.assertIn("/app/posapp", page_script)
        self.assertIn('frappe.pages["pos"]', page_script)


if __name__ == "__main__":
    unittest.main()
