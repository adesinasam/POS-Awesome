import importlib.util
import pathlib
import sys
import types
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]


def _install_stubs():
    frappe_module = types.ModuleType("frappe")
    payments_module = types.ModuleType("posawesome.posawesome.api.payments")

    frappe_module._ = lambda text: text
    frappe_module.throw = lambda message: (_ for _ in ()).throw(Exception(message))
    frappe_module.whitelist = lambda *args, **kwargs: (lambda fn: fn)

    payments_state = {"credits": []}

    def _get_available_credit(customer, company):
        return list(payments_state["credits"])

    payments_module.get_available_credit = _get_available_credit

    sys.modules["frappe"] = frappe_module
    sys.modules["posawesome.posawesome.api.payments"] = payments_module
    return payments_state


def _load_stored_value_module():
    module_name = "posawesome.posawesome.api.stored_value"
    file_path = REPO_ROOT / "posawesome" / "posawesome" / "api" / "stored_value.py"
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


class TestStoredValueApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payments_state = _install_stubs()
        cls.module = _load_stored_value_module()

    def setUp(self):
        self.payments_state["credits"] = []

    def test_get_stored_value_summary_aggregates_available_sources(self):
        self.payments_state["credits"] = [
            {
                "type": "Invoice",
                "credit_origin": "SINV-RET-0001",
                "total_credit": 50,
                "credit_to_redeem": 0,
                "source_type": "Sales Return",
            },
            {
                "type": "Advance",
                "credit_origin": "ACC-PAY-0001",
                "total_credit": 25,
                "credit_to_redeem": 0,
                "source_type": "Payment Entry",
            },
        ]

        result = self.module.get_stored_value_summary(
            customer="CUST-0001",
            company="Test Company",
        )

        self.assertEqual(result["available_amount"], 75.0)
        self.assertEqual(result["source_count"], 2)
        self.assertEqual(len(result["sources"]), 2)
        self.assertEqual(result["sources"][0]["credit_origin"], "SINV-RET-0001")

    def test_get_available_stored_value_reuses_credit_sources(self):
        self.payments_state["credits"] = [
            {
                "type": "Advance",
                "credit_origin": "ACC-PAY-0002",
                "total_credit": 10,
                "credit_to_redeem": 0,
                "source_type": "Payment Entry",
            }
        ]

        result = self.module.get_available_stored_value(
            customer="CUST-0001",
            company="Test Company",
        )

        self.assertEqual(result[0]["credit_origin"], "ACC-PAY-0002")
        self.assertEqual(result[0]["total_credit"], 10)


if __name__ == "__main__":
    unittest.main()
