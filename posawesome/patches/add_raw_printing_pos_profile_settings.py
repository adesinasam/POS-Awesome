import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field


FIELDS = [
    {
        "fieldname": "posa_raw_printing",
        "label": "Use Raw Receipt Printing",
        "fieldtype": "Check",
        "default": "0",
        "description": (
            "Send invoices, orders, and payment receipts to QZ Tray as ESC/POS "
            "raw commands instead of HTML. Barcode and label raw ZPL/EPL printing "
            "is controlled from the barcode printing screen."
        ),
        "insert_after": "posa_qz_printer_name",
    },
    {
        "fieldname": "posa_raw_print_width",
        "label": "Raw Receipt Width",
        "fieldtype": "Int",
        "default": "42",
        "description": (
            "Receipt width in ESC/POS text characters. Common values are 42 for "
            "80mm and 32 for 58mm printers."
        ),
        "insert_after": "posa_raw_printing",
    },
]


def _upsert_custom_field(field):
    fieldname = field["fieldname"]
    custom_field_name = f"POS Profile-{fieldname}"

    if not frappe.db.exists("Custom Field", custom_field_name):
        create_custom_field("POS Profile", field)
        return

    frappe.db.set_value(
        "Custom Field",
        custom_field_name,
        {key: value for key, value in field.items() if key != "insert_after"},
        update_modified=False,
    )
    frappe.db.set_value(
        "Custom Field",
        custom_field_name,
        "insert_after",
        field["insert_after"],
        update_modified=False,
    )


def execute():
    for field in FIELDS:
        _upsert_custom_field(field)

    frappe.clear_cache(doctype="POS Profile")
