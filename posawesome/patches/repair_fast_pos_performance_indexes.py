import frappe


FAST_POS_INDEXES = [
    (
        "Item",
        [
            "disabled",
            "is_sales_item",
            "is_fixed_asset",
            "item_group",
            "item_name",
            "item_code",
        ],
        "posa_item_fast_search",
    ),
    (
        "Item",
        [
            "modified",
            "item_group",
            "disabled",
            "is_sales_item",
            "is_fixed_asset",
            "item_code",
        ],
        "posa_item_delta_scope",
    ),
    (
        "Item Price",
        [
            "price_list",
            "currency",
            "item_code",
            "customer",
            "valid_from",
            "valid_upto",
        ],
        "posa_item_price_fast",
    ),
    (
        "Bin",
        ["warehouse", "modified", "item_code"],
        "posa_bin_delta",
    ),
    (
        "Bin",
        ["warehouse", "item_code", "modified"],
        "posa_bin_item_delta",
    ),
    (
        "Sales Invoice",
        ["docstatus", "company", "posting_date", "name"],
        "posa_si_hot_catalog",
    ),
    (
        "Sales Invoice Item",
        ["item_code", "warehouse", "parent"],
        "posa_sii_hot_catalog",
    ),
    (
        "Item Barcode",
        ["barcode", "parent"],
        "posa_barcode_parent",
    ),
]


def execute():
    for doctype, fields, index_name in FAST_POS_INDEXES:
        try:
            frappe.db.add_index(doctype, fields, index_name=index_name)
        except Exception as error:
            frappe.log_error(
                str(error),
                f"Repair fast POS performance index: {index_name}",
            )
