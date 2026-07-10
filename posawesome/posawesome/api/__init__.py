"""Lazy public API facade for POS Awesome.

Frappe imports dotted whitelisted method paths by importing the package chain
first. Eagerly importing every API module here makes unrelated requests wait
on modules such as ``invoices`` and can trip Python's ``_ModuleLock`` deadlock
detection when concurrent requests resolve different API methods.
"""

from importlib import import_module


_EXPORTS = {
    "batch_create_print_logs": ".barcode_print_log",
    "build_scale_barcode": ".items",
    "check_opening_shift": ".shifts",
    "commit_document_flow_action": ".commercial_flow",
    "create_customer": ".customers",
    "create_opening_voucher": ".shifts",
    "create_payment_request": ".payments",
    "create_purchase_item": ".purchase_orders",
    "create_purchase_order": ".purchase_orders",
    "create_supplier": ".purchase_orders",
    "delete_invoice": ".invoices",
    "delete_label_template": ".label_templates",
    "get_active_gift_coupons": ".offers",
    "get_active_pos_profile": ".utils",
    "get_active_pricing_rules": ".pricing_rules",
    "get_app_branch": ".utilities",
    "get_app_info": ".utilities",
    "get_applicable_delivery_charges": ".offers",
    "get_available_credit": ".payments",
    "get_available_stored_value": ".stored_value",
    "get_bundle_components": ".bundles",
    "get_customer_addresses": ".customers",
    "get_customer_info": ".customers",
    "get_customer_names": ".customers",
    "get_customers_count": ".customers",
    "get_dashboard_data": ".dashboard",
    "get_default_warehouse": ".utils",
    "get_draft_purchase_order": ".purchase_orders",
    "get_draft_invoices": ".invoices",
    "get_item_attributes": ".items",
    "get_item_brand": ".items",
    "get_item_detail": ".items",
    "get_items": ".items",
    "get_items_count": ".items",
    "get_items_details": ".items",
    "get_items_from_barcode": ".items",
    "get_items_groups": ".items",
    "get_hot_items": ".items",
    "get_label_template_detail": ".label_templates",
    "get_label_templates": ".label_templates",
    "get_language_options": ".utilities",
    "get_last_invoice_rates": ".invoices",
    "get_next_sscc_serials": ".sscc_api",
    "get_offers": ".offers",
    "get_opening_dialog_data": ".shifts",
    "get_pos_coupon": ".offers",
    "get_pos_profile_tax_inclusive": ".utilities",
    "get_print_logs": ".barcode_print_log",
    "get_print_stats": ".barcode_print_log",
    "get_purchase_management_order": ".purchase_orders",
    "get_sales_person_names": ".customers",
    "get_selling_price_lists": ".utilities",
    "get_shipping_addresses": ".label_templates",
    "get_stored_value_summary": ".stored_value",
    "get_translation_dict": ".utilities",
    "get_version": ".utilities",
    "get_warehouses": ".utils",
    "list_source_documents": ".commercial_flow",
    "make_address": ".customers",
    "parse_scale_barcode": ".items",
    "prepare_document_flow_action": ".commercial_flow",
    "process_purchase_management_action": ".purchase_orders",
    "reconcile_line_prices": ".pricing_rules",
    "save_label_template": ".label_templates",
    "search_draft_purchase_orders": ".purchase_orders",
    "search_invoices_for_return": ".invoices",
    "search_purchase_management_orders": ".purchase_orders",
    "search_orders": ".sales_orders",
    "search_suppliers": ".purchase_orders",
    "set_customer_info": ".customers",
    "submit_invoice": ".invoices",
    "submit_quotation": ".quotations",
    "submit_sales_order": ".sales_orders",
    "update_invoice": ".invoices",
    "update_quotation": ".quotations",
    "update_sales_order": ".sales_orders",
    "validate_return_items": ".invoices",
    "verify_barcode": ".barcode_print_log",
}

__all__ = sorted(_EXPORTS)


def __getattr__(name):
    module_name = _EXPORTS.get(name)
    if not module_name:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    value = getattr(import_module(f"{__name__}{module_name}"), name)
    globals()[name] = value
    return value


def __dir__():
    return sorted({*globals(), *__all__})
