import frappe


FIELD_UPDATES = {
    "posa_open_print_in_new_tab": {
        "insert_after": "posa_allow_print_draft_invoices",
    },
    "posa_silent_print": {
        "label": "Use QZ Tray for Silent Print",
        "description": (
            "Use QZ Tray for direct invoice, order, and payment receipt printing. "
            "Keep 'Open Print in New Tab' disabled when using direct QZ printing."
        ),
        "insert_after": "posa_open_print_in_new_tab",
    },
    "posa_qz_printer_name": {
        "insert_after": "posa_silent_print",
    },
    "posa_raw_printing": {
        "insert_after": "posa_qz_printer_name",
    },
    "posa_raw_print_width": {
        "insert_after": "posa_raw_printing",
    },
    "posa_print_format_rules": {
        "insert_after": "posa_raw_print_width",
    },
    "posa_section_cash_movement": {
        "insert_after": "posa_print_format_rules",
    },
}


def execute():
    for fieldname, updates in FIELD_UPDATES.items():
        custom_field_name = f"POS Profile-{fieldname}"
        if frappe.db.exists("Custom Field", custom_field_name):
            frappe.db.set_value(
                "Custom Field",
                custom_field_name,
                updates,
                update_modified=False,
            )

    frappe.clear_cache(doctype="POS Profile")
