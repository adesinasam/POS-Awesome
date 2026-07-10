import importlib.util
import pathlib
import sys
import types
import unittest


REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
PATCHES_PATH = REPO_ROOT / "posawesome" / "patches.txt"
PATCH_PATH = REPO_ROOT / "posawesome" / "patches" / "repair_fast_pos_performance_indexes.py"
PATCH_MODULE = "posawesome.patches.repair_fast_pos_performance_indexes"


class FakeDB:
    def __init__(self):
        self.indexes = []

    def add_index(self, doctype, fields, index_name=None):
        self.indexes.append((doctype, tuple(fields), index_name))


def load_patch_module(fake_frappe):
    original_frappe = sys.modules.get("frappe")
    sys.modules["frappe"] = fake_frappe
    try:
        spec = importlib.util.spec_from_file_location(
            "test_fast_pos_performance_indexes_patch_target",
            PATCH_PATH,
        )
        if spec is None or spec.loader is None:
            raise ImportError("Unable to load fast POS performance indexes patch")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if original_frappe is None:
            sys.modules.pop("frappe", None)
        else:
            sys.modules["frappe"] = original_frappe


class TestFastPosPerformanceIndexesPatch(unittest.TestCase):
    def test_migration_chain_includes_fast_pos_index_repair(self):
        patches = PATCHES_PATH.read_text().splitlines()

        self.assertIn(PATCH_MODULE, patches)

    def test_patch_adds_fast_counter_indexes(self):
        fake_frappe = types.SimpleNamespace(
            db=FakeDB(),
            log_error=lambda *args, **kwargs: None,
        )
        module = load_patch_module(fake_frappe)

        module.execute()

        expected = [
            (doctype, tuple(fields), index_name)
            for doctype, fields, index_name in module.FAST_POS_INDEXES
        ]
        self.assertEqual(fake_frappe.db.indexes, expected)
        self.assertIn(
            (
                "Sales Invoice",
                ("docstatus", "company", "posting_date", "name"),
                "posa_si_hot_catalog",
            ),
            fake_frappe.db.indexes,
        )
        self.assertIn(
            (
                "Item Barcode",
                ("barcode", "parent"),
                "posa_barcode_parent",
            ),
            fake_frappe.db.indexes,
        )


if __name__ == "__main__":
    unittest.main()
