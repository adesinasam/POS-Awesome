import importlib
import sys
import types
import unittest


def _drop_posawesome_modules():
    for module_name in list(sys.modules):
        if module_name == "posawesome" or module_name.startswith("posawesome."):
            del sys.modules[module_name]


def _install_purchase_order_stubs():
    frappe_module = types.ModuleType("frappe")
    frappe_module._ = lambda text: text
    frappe_module.throw = lambda message: (_ for _ in ()).throw(Exception(message))
    frappe_module.whitelist = lambda *args, **kwargs: (lambda fn: fn)
    frappe_module.flags = types.SimpleNamespace(ignore_account_permission=False)
    sys.modules["frappe"] = frappe_module

    frappe_utils = types.ModuleType("frappe.utils")
    frappe_utils.cint = int
    frappe_utils.flt = float
    frappe_utils.nowdate = lambda: "2026-04-17"
    frappe_utils.getdate = lambda value=None: value
    sys.modules["frappe.utils"] = frappe_utils

    erpnext_accounts_party = types.ModuleType("erpnext.accounts.party")
    erpnext_accounts_party.get_party_account = lambda *args, **kwargs: "Creditors - TC"
    sys.modules["erpnext.accounts.party"] = erpnext_accounts_party

    utils_module = types.ModuleType("posawesome.posawesome.api.utils")
    utils_module.get_active_pos_profile = lambda: {}
    utils_module.assert_pos_profile_write_allowed = lambda *args, **kwargs: None
    sys.modules["posawesome.posawesome.api.utils"] = utils_module


class TestApiPackageImports(unittest.TestCase):
    def setUp(self):
        self.orig_sys_modules = sys.modules.copy()
        _drop_posawesome_modules()

    def tearDown(self):
        sys.modules.clear()
        sys.modules.update(self.orig_sys_modules)

    def test_api_package_import_does_not_import_backend_modules(self):
        api = importlib.import_module("posawesome.posawesome.api")

        self.assertIn("create_supplier", dir(api))
        self.assertNotIn("posawesome.posawesome.api.invoices", sys.modules)
        self.assertNotIn("posawesome.posawesome.api.purchase_orders", sys.modules)

    def test_purchase_order_method_import_does_not_import_invoices(self):
        _install_purchase_order_stubs()

        module = importlib.import_module("posawesome.posawesome.api.purchase_orders")

        self.assertEqual(module.__name__, "posawesome.posawesome.api.purchase_orders")
        self.assertNotIn("posawesome.posawesome.api.invoices", sys.modules)

    def test_package_level_export_is_lazy(self):
        _install_purchase_order_stubs()
        api = importlib.import_module("posawesome.posawesome.api")

        create_supplier = api.create_supplier

        self.assertEqual(create_supplier.__name__, "create_supplier")
        self.assertIn("posawesome.posawesome.api.purchase_orders", sys.modules)
        self.assertNotIn("posawesome.posawesome.api.invoices", sys.modules)

    def test_from_import_uses_lazy_export(self):
        _install_purchase_order_stubs()
        namespace = {}

        exec("from posawesome.posawesome.api import create_supplier", namespace)

        self.assertEqual(namespace["create_supplier"].__name__, "create_supplier")
        self.assertIn("posawesome.posawesome.api.purchase_orders", sys.modules)
        self.assertNotIn("posawesome.posawesome.api.invoices", sys.modules)


if __name__ == "__main__":
    unittest.main()
