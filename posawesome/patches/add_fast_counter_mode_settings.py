import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field


FIELDS = [
    {
        "fieldname": "posa_fast_counter_mode",
        "label": "Fast Counter Mode",
        "fieldtype": "Check",
        "default": "0",
        "description": "Preload a hot item catalog and search it locally before the full catalog or server fallback.",
        "insert_after": "posa_server_cache_duration",
    },
    {
        "fieldname": "posa_hot_catalog_limit",
        "label": "Hot Catalog Limit",
        "fieldtype": "Int",
        "default": "5000",
        "non_negative": 1,
        "depends_on": "posa_fast_counter_mode",
        "description": "Number of recent or frequently sold items to keep in the in-memory fast counter catalog.",
        "insert_after": "posa_fast_counter_mode",
    },
]


def execute():
    for field in FIELDS:
        custom_field_name = f"POS Profile-{field['fieldname']}"
        if not frappe.db.exists("Custom Field", custom_field_name):
            create_custom_field("POS Profile", field)
            continue

        updates = {key: value for key, value in field.items() if key != "insert_after"}
        frappe.db.set_value(
            "Custom Field",
            custom_field_name,
            updates,
            update_modified=False,
        )
        frappe.db.set_value(
            "Custom Field",
            custom_field_name,
            "insert_after",
            field["insert_after"],
            update_modified=False,
        )
