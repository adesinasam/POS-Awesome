import datetime
import importlib.util
import pathlib
import sys
import types
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]


def _install_stubs():
    posawesome_pkg = types.ModuleType("posawesome")
    posawesome_pkg.__path__ = [str(REPO_ROOT / "posawesome")]
    sys.modules.setdefault("posawesome", posawesome_pkg)

    posawesome_inner_pkg = types.ModuleType("posawesome.posawesome")
    posawesome_inner_pkg.__path__ = [str(REPO_ROOT / "posawesome" / "posawesome")]
    sys.modules.setdefault("posawesome.posawesome", posawesome_inner_pkg)

    posawesome_api_pkg = types.ModuleType("posawesome.posawesome.api")
    posawesome_api_pkg.__path__ = [str(REPO_ROOT / "posawesome" / "posawesome" / "api")]
    sys.modules.setdefault("posawesome.posawesome.api", posawesome_api_pkg)

    frappe_module = types.ModuleType("frappe")
    frappe_module._ = lambda text: text
    frappe_module.throw = lambda message: (_ for _ in ()).throw(Exception(message))
    frappe_module.whitelist = lambda *args, **kwargs: (lambda fn: fn)
    frappe_module.get_doc = lambda *args, **kwargs: None
    frappe_module.flags = types.SimpleNamespace(ignore_account_permission=False)

    class _Db:
        def __init__(self):
            self.sql_calls = []

        def get_single_value(self, doctype, fieldname):
            if doctype == "Buying Settings" and fieldname == "buying_price_list":
                return "Standard Buying"
            return None

        def get_value(self, doctype, filters, fieldname=None):
            if doctype == "Price List" and filters == "Standard Buying" and fieldname == "currency":
                return "PKR"
            if doctype == "Price List" and isinstance(filters, dict) and fieldname == "name":
                return None
            if doctype == "Supplier" and fieldname == "default_price_list":
                return None
            if doctype == "Price List" and fieldname == "buying":
                return 1
            return None

        def exists(self, doctype, name):
            return doctype == "Supplier" and name == "SUP-001"

        def sql(self, query, params=None, as_dict=False):
            self.sql_calls.append((query, params, as_dict))
            if "FROM `tabPurchase Invoice Item`" not in query:
                return []
            if params and len(params) > 1 and params[1] == "SUP-001":
                return [
                    {
                        "item_code": "ITEM-001",
                        "rate": 44,
                        "uom": "Nos",
                        "currency": "PKR",
                        "invoice": "PINV-SUP-1",
                        "posting_date": "2026-04-17",
                        "supplier": "SUP-001",
                    }
                ]
            return [
                {
                    "item_code": "ITEM-001",
                    "rate": 41,
                    "uom": "Nos",
                    "currency": "PKR",
                    "invoice": "PINV-ANY-1",
                    "posting_date": "2026-04-16",
                    "supplier": "SUP-XYZ",
                }
            ]

    def fake_get_all(doctype, filters=None, fields=None, **kwargs):
        if doctype == "Item Price":
            raise AssertionError("Item Price lookups should use frappe.get_list")
        return []

    def fake_get_list(doctype, filters=None, fields=None, **kwargs):
        if doctype == "Item Price":
            return []
        return []

    frappe_module.db = _Db()
    frappe_module.get_all = fake_get_all
    frappe_module.get_list = fake_get_list
    sys.modules["frappe"] = frappe_module

    frappe_utils = types.ModuleType("frappe.utils")
    frappe_utils.cint = int
    frappe_utils.flt = lambda value=0, *args, **kwargs: float(value or 0)
    frappe_utils.nowdate = lambda: "2026-04-17"
    def fake_getdate(value=None):
        if value is None:
            return datetime.date(2026, 4, 17)
        if isinstance(value, datetime.date):
            return value
        if isinstance(value, str):
            year, month, day = value.strip().split("-")
            return datetime.date(int(year), int(month), int(day))
        return value

    frappe_utils.getdate = fake_getdate
    sys.modules["frappe.utils"] = frappe_utils

    erpnext_accounts_party = types.ModuleType("erpnext.accounts.party")
    erpnext_accounts_party.get_party_account = lambda *args, **kwargs: "Creditors - TC"
    sys.modules["erpnext.accounts.party"] = erpnext_accounts_party

    utils_module = types.ModuleType("posawesome.posawesome.api.utils")
    utils_module.get_active_pos_profile = lambda: {
        "name": "POS-TEST",
        "warehouse": "Stores - TC",
        "company": "Test Co",
    }
    utils_module.get_default_warehouse = lambda company=None: "Stores - TC"
    sys.modules["posawesome.posawesome.api.utils"] = utils_module


def _load_module():
    module_name = "posawesome.posawesome.api.purchase_orders"
    file_path = REPO_ROOT / "posawesome" / "posawesome" / "api" / "purchase_orders.py"
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


class AttrDict(dict):
    def __getattribute__(self, key):
        if not key.startswith("__") and dict.__contains__(self, key):
            return dict.__getitem__(self, key)
        return super().__getattribute__(key)

    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError as exc:
            raise AttributeError(key) from exc

    def __setattr__(self, key, value):
        self[key] = value


class FakeDoc(AttrDict):
    def __init__(self, data=None):
        super().__init__(data or {})
        self.setdefault("items", [])
        self.setdefault("references", [])
        self.flags = types.SimpleNamespace(ignore_permissions=False)
        self.inserted = False
        self.submitted = False

    def append(self, table, row):
        self.setdefault(table, []).append(AttrDict(row))

    def insert(self):
        self.inserted = True

    def submit(self):
        self.submitted = True


class TestPurchaseOrdersApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.orig_sys_modules = sys.modules.copy()
        _install_stubs()
        cls.module = _load_module()

    @classmethod
    def tearDownClass(cls):
        cls.module = None
        sys.modules.clear()
        sys.modules.update(cls.orig_sys_modules)

    def test_get_last_buying_rate_works_without_supplier(self):
        result = self.module.get_last_buying_rate(None, ["ITEM-001"])

        self.assertEqual(result["ITEM-001"]["rate"], 41)
        self.assertEqual(result["ITEM-001"]["source"], "last_invoice")
        self.assertEqual(result["ITEM-001"]["invoice"], "PINV-ANY-1")
        self.assertEqual(result["ITEM-001"]["supplier"], "SUP-XYZ")

    def test_get_last_buying_rate_prefers_supplier_specific_history(self):
        self.module.frappe.db.sql_calls.clear()

        result = self.module.get_last_buying_rate("SUP-001", ["ITEM-001"])

        self.assertEqual(result["ITEM-001"]["rate"], 44)
        self.assertEqual(result["ITEM-001"]["invoice"], "PINV-SUP-1")
        self.assertEqual(result["ITEM-001"]["supplier"], "SUP-001")
        purchase_invoice_sql = next(
            call for call in self.module.frappe.db.sql_calls if "FROM `tabPurchase Invoice Item`" in call[0]
        )
        self.assertIn("ROW_NUMBER() OVER", purchase_invoice_sql[0])

    def test_get_last_buying_rate_wraps_json_scalar_item_code_before_tuple_lookup(self):
        self.module.frappe.db.sql_calls.clear()

        result = self.module.get_last_buying_rate(None, '"ITEM-001"')

        self.assertEqual(result["ITEM-001"]["rate"], 41)
        purchase_invoice_sql = next(
            call for call in self.module.frappe.db.sql_calls if "FROM `tabPurchase Invoice Item`" in call[0]
        )
        self.assertEqual(purchase_invoice_sql[1][0], ("ITEM-001",))

    def test_get_last_buying_rate_ignores_invalid_decoded_item_code_shapes(self):
        self.module.frappe.db.sql_calls.clear()

        result = self.module.get_last_buying_rate(None, '{"bad": "shape"}')

        self.assertEqual(result, {})
        self.assertFalse(
            any("FROM `tabPurchase Invoice Item`" in call[0] for call in self.module.frappe.db.sql_calls)
        )

    def test_normalize_date_for_backend_accepts_purchase_order_display_dates(self):
        self.assertEqual(self.module._normalize_date_for_backend("29-06-2026"), "2026-06-29")
        self.assertEqual(self.module._normalize_date_for_backend("29/06/2026"), "2026-06-29")
        self.assertEqual(self.module._normalize_date_for_backend("2026-6-29"), "2026-06-29")

    def test_normalize_date_for_backend_uses_fallback_for_invalid_dates(self):
        fallback = "2026-04-17"

        self.assertEqual(self.module._normalize_date_for_backend("invalid date", fallback), fallback)
        self.assertEqual(self.module._normalize_date_for_backend("2026-02-30", fallback), fallback)

    def test_create_purchase_receipt_defaults_missing_payload_row(self):
        po_doc = AttrDict(
            {
                "name": "PO-001",
                "supplier": "SUP-001",
                "company": "Test Co",
                "currency": "PKR",
                "items": [
                    AttrDict(
                        {
                            "name": "POI-001",
                            "item_code": "ITEM-001",
                            "item_name": "Item One",
                            "qty": 2,
                            "received_qty": 0,
                            "uom": "Nos",
                            "stock_uom": "Nos",
                            "conversion_factor": 1,
                            "rate": 10,
                            "warehouse": "Stores - TC",
                            "schedule_date": "2026-04-17",
                        }
                    )
                ],
            }
        )
        receipt_doc = FakeDoc({"doctype": "Purchase Receipt", "name": "PREC-001"})
        original_get_doc = self.module.frappe.get_doc
        original_resolver = self.module._resolve_po_input_row
        self.module.frappe.get_doc = lambda data, *args, **kwargs: receipt_doc if isinstance(data, dict) else None
        self.module._resolve_po_input_row = lambda *_args: None

        try:
            receipt_name = self.module._create_purchase_receipt(
                po_doc,
                {"receive": 1, "posting_date": "2026-04-17"},
                "Stores - TC",
                "2026-04-17",
            )
        finally:
            self.module.frappe.get_doc = original_get_doc
            self.module._resolve_po_input_row = original_resolver

        self.assertEqual(receipt_name, "PREC-001")
        self.assertEqual(receipt_doc.items[0].qty, 2)
        self.assertTrue(receipt_doc.inserted)
        self.assertTrue(receipt_doc.submitted)

    def test_create_purchase_invoice_defaults_missing_payload_row(self):
        po_doc = AttrDict(
            {
                "name": "PO-001",
                "supplier": "SUP-001",
                "company": "Test Co",
                "currency": "PKR",
                "items": [
                    AttrDict(
                        {
                            "name": "POI-001",
                            "item_code": "ITEM-001",
                            "item_name": "Item One",
                            "qty": 3,
                            "uom": "Nos",
                            "stock_uom": "Nos",
                            "conversion_factor": 1,
                            "rate": 10,
                            "warehouse": "Stores - TC",
                            "schedule_date": "2026-04-17",
                        }
                    )
                ],
            }
        )
        invoice_doc = FakeDoc({"doctype": "Purchase Invoice", "name": "PINV-001"})
        original_get_doc = self.module.frappe.get_doc
        original_resolver = self.module._resolve_po_input_row
        original_billed = self.module._get_billed_qty_by_po_item
        self.module.frappe.get_doc = lambda data, *args, **kwargs: invoice_doc if isinstance(data, dict) else None
        self.module._resolve_po_input_row = lambda *_args: None
        self.module._get_billed_qty_by_po_item = lambda _po_doc: {}

        try:
            invoice_name = self.module._create_purchase_invoice(
                po_doc,
                {"invoice_date": "2026-04-17"},
                "Stores - TC",
                "2026-04-17",
            )
        finally:
            self.module.frappe.get_doc = original_get_doc
            self.module._resolve_po_input_row = original_resolver
            self.module._get_billed_qty_by_po_item = original_billed

        self.assertEqual(invoice_name, "PINV-001")
        self.assertEqual(invoice_doc.items[0].qty, 3)
        self.assertTrue(invoice_doc.inserted)
        self.assertTrue(invoice_doc.submitted)

    def test_create_payment_entry_allocates_across_purchase_invoices(self):
        invoices = [
            AttrDict(
                {
                    "doctype": "Purchase Invoice",
                    "name": "PINV-001",
                    "supplier": "SUP-001",
                    "outstanding_amount": 70,
                }
            ),
            AttrDict(
                {
                    "doctype": "Purchase Invoice",
                    "name": "PINV-002",
                    "supplier": "SUP-001",
                    "outstanding_amount": 80,
                }
            ),
        ]
        payment_doc = FakeDoc({"doctype": "Payment Entry", "name": "PE-001"})
        original_new_doc = getattr(self.module.frappe, "new_doc", None)
        original_mop_account = self.module._get_mode_of_payment_account
        self.module.frappe.new_doc = lambda doctype: payment_doc
        self.module._get_mode_of_payment_account = lambda _mode, _company: "Cash - TC"

        try:
            created = self.module._create_payment_entry(
                invoices,
                [{"mode_of_payment": "Cash", "amount": 120}],
                "Test Co",
                "2026-04-17",
            )
        finally:
            if original_new_doc is None:
                delattr(self.module.frappe, "new_doc")
            else:
                self.module.frappe.new_doc = original_new_doc
            self.module._get_mode_of_payment_account = original_mop_account

        self.assertEqual(created, ["PE-001"])
        self.assertEqual(
            [
                (row.reference_doctype, row.reference_name, row.allocated_amount)
                for row in payment_doc.references
            ],
            [
                ("Purchase Invoice", "PINV-001", 70),
                ("Purchase Invoice", "PINV-002", 50),
            ],
        )


if __name__ == "__main__":
    unittest.main()
