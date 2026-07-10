import frappe
from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_field


FIELD_UPDATES = {
    "posa_section_print_delivery": {
        "label": _("Printing and Delivery"),
        "fieldtype": "Section Break",
        "collapsible": 1,
        "insert_after": "select_print_heading",
    },
    "posa_use_delivery_charges": {
        "insert_after": "posa_section_print_delivery",
    },
    "posa_auto_set_delivery_charges": {
        "insert_after": "posa_use_delivery_charges",
    },
    "posa_display_additional_notes": {
        "insert_after": "posa_auto_set_delivery_charges",
    },
    "posa_display_authorization_code": {
        "insert_after": "posa_display_additional_notes",
    },
    "posa_allow_print_last_invoice": {
        "insert_after": "posa_display_authorization_code",
    },
    "posa_allow_print_draft_invoices": {
        "insert_after": "posa_allow_print_last_invoice",
    },
    "posa_allow_select_print_format_in_payments": {
        "insert_after": "posa_allow_print_draft_invoices",
    },
    "posa_open_print_in_new_tab": {
        "insert_after": "posa_allow_select_print_format_in_payments",
    },
    "posa_silent_print": {
        "label": _("Use QZ Tray for Silent Print"),
        "description": _(
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
    """Refresh POS Profile print-field layout for sites that already migrated."""
    for fieldname, updates in FIELD_UPDATES.items():
        custom_field_name = f"POS Profile-{fieldname}"
        if frappe.db.exists("Custom Field", custom_field_name):
            frappe.db.set_value(
                "Custom Field",
                custom_field_name,
                updates,
                update_modified=False,
            )
        elif fieldname == "posa_section_print_delivery":
            create_custom_field(
                "POS Profile",
                {
                    "fieldname": fieldname,
                    **updates,
                },
            )

    frappe.clear_cache(doctype="POS Profile")
