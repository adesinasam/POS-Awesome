import datetime
import importlib.util
import pathlib
import sys
import types
import unittest
from types import SimpleNamespace


REPO_ROOT = pathlib.Path(__file__).resolve().parents[4]
POS_COUPON_PATH = REPO_ROOT / "posawesome" / "posawesome" / "doctype" / "pos_coupon" / "pos_coupon.py"


def _install_frappe_stubs():
    frappe_module = types.ModuleType("frappe")
    frappe_model_module = types.ModuleType("frappe.model")
    frappe_document_module = types.ModuleType("frappe.model.document")
    frappe_utils_module = types.ModuleType("frappe.utils")

    state = {
        "exists": True,
        "coupon": None,
        "offer": None,
        "count": 0,
    }

    class Document:
        pass

    def get_doc(doctype, filters):
        if doctype == "POS Coupon":
            return state["coupon"]
        if doctype == "POS Offer":
            return state["offer"]
        return None

    def getdate(value=None):
        if not value:
            return datetime.date(2026, 5, 21)
        if isinstance(value, datetime.date):
            return value
        return datetime.date.fromisoformat(str(value))

    frappe_module._ = lambda text: text
    frappe_module.get_doc = get_doc
    frappe_module.throw = lambda message: (_ for _ in ()).throw(Exception(message))
    frappe_module.generate_hash = lambda length=10: "HASHVALUE"[:length]
    frappe_module.db = SimpleNamespace(
        exists=lambda *args, **kwargs: state["exists"],
        count=lambda *args, **kwargs: state["count"],
    )
    frappe_document_module.Document = Document
    frappe_utils_module.strip = lambda value: str(value).strip()
    frappe_utils_module.getdate = getdate
    frappe_utils_module.today = lambda: "2026-05-21"

    sys.modules["frappe"] = frappe_module
    sys.modules["frappe.model"] = frappe_model_module
    sys.modules["frappe.model.document"] = frappe_document_module
    sys.modules["frappe.utils"] = frappe_utils_module

    return state


def _load_pos_coupon_module():
    module_name = "posawesome.posawesome.doctype.pos_coupon.pos_coupon"
    spec = importlib.util.spec_from_file_location(module_name, POS_COUPON_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


class TestPOSCoupon(unittest.TestCase):
    def setUp(self):
        self._orig_sys_modules = sys.modules.copy()
        self.state = _install_frappe_stubs()
        self.module = _load_pos_coupon_module()

    def tearDown(self):
        sys.modules.clear()
        sys.modules.update(self._orig_sys_modules)

    def _set_coupon_and_offer(self, coupon=None, offer=None):
        coupon_data = {
            "name": "COUPON-1",
            "coupon_code": "SAVE20",
            "coupon_type": "Promotional",
            "customer": None,
            "company": "Company A",
            "pos_offer": "OFFER-1",
            "valid_from": None,
            "valid_upto": None,
            "used": 0,
            "maximum_use": 0,
            "one_use": 0,
            **(coupon or {}),
        }
        offer_data = {
            "name": "OFFER-1",
            "company": "Company A",
            "disable": 0,
            "coupon_based": 1,
            "valid_from": None,
            "valid_upto": None,
            **(offer or {}),
        }
        self.state["coupon"] = SimpleNamespace(**coupon_data)
        self.state["offer"] = SimpleNamespace(**offer_data)

    def test_coupon_without_valid_upto_is_valid_when_offer_has_no_expiry(self):
        self._set_coupon_and_offer()

        result = self.module.check_coupon_code("save20", customer="CUST-1", company="Company A")

        self.assertEqual(result["msg"], "Apply")
        self.assertEqual(result["coupon"].name, "COUPON-1")

    def test_coupon_with_blank_valid_upto_is_treated_as_no_expiry(self):
        self._set_coupon_and_offer(coupon={"valid_upto": ""}, offer={"valid_upto": ""})

        result = self.module.check_coupon_code("SAVE20", customer="CUST-1", company="Company A")

        self.assertEqual(result["msg"], "Apply")

    def test_coupon_expiry_is_only_enforced_when_valid_upto_has_a_date(self):
        self._set_coupon_and_offer(coupon={"valid_upto": "2026-05-20"})

        result = self.module.check_coupon_code("SAVE20", customer="CUST-1", company="Company A")

        self.assertEqual(result["msg"], "Sorry, this coupon code's validity has expired")

    def test_validate_clamps_blank_coupon_expiry_to_offer_expiry_without_using_today(self):
        self.state["offer"] = SimpleNamespace(
            company="Company A",
            coupon_based=1,
            disable=0,
            valid_from=None,
            valid_upto="2026-06-30",
        )
        coupon = self.module.POSCoupon()
        coupon.coupon_type = "Promotional"
        coupon.company = "Company A"
        coupon.pos_offer = "OFFER-1"
        coupon.valid_from = None
        coupon.valid_upto = None

        coupon.validate()

        self.assertEqual(coupon.valid_upto, datetime.date(2026, 6, 30))
