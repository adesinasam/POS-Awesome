from frappe.model.document import Document
from frappe.utils import flt


class POSGiftCard(Document):
    def validate(self):
        self.current_balance = flt(self.current_balance or 0)
