import frappe
from frappe.model.document import Document


class POSInvoiceSubmissionLedger(Document):
    def validate(self):
        if not self.client_request_id:
            frappe.throw("Client Request ID is required")
        if not self.company:
            frappe.throw("Company is required")
        if not self.pos_profile:
            frappe.throw("POS Profile is required")
        if not self.document_type:
            frappe.throw("Document Type is required")
        if not self.ledger_key:
            frappe.throw("Ledger Key is required")
