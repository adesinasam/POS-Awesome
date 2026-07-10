# -*- coding: utf-8 -*-

from __future__ import unicode_literals

import frappe

from .payments import get_available_credit


def _normalize_amount(value):
    try:
        return round(float(value or 0), 2)
    except Exception:
        return 0.0


@frappe.whitelist()
def get_available_stored_value(customer=None, company=None):
    if not customer:
        frappe.throw(frappe._("Customer is required to fetch stored value."))
    if not company:
        frappe.throw(frappe._("Company is required to fetch stored value."))

    return get_available_credit(customer=customer, company=company)


@frappe.whitelist()
def get_stored_value_summary(customer=None, company=None):
    sources = get_available_stored_value(customer=customer, company=company)
    available_amount = sum(_normalize_amount(row.get("total_credit")) for row in sources)

    return {
        "available_amount": _normalize_amount(available_amount),
        "source_count": len(sources),
        "sources": sources,
    }
