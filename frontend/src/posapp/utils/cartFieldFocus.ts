export type CartShortcutField = "qty" | "uom" | "rate" | "discount_percentage";

export interface CartFieldFocusOptions {
	activate?: boolean;
}

const FIELD_SELECTORS: Record<CartShortcutField, string> = {
	qty: '[data-column-key="qty"] .posa-cart-table__qty-display',
	uom: '[data-column-key="uom"] .posa-cart-table__editor-display',
	rate: '[data-column-key="rate"] .posa-cart-table__editor-display',
	discount_percentage: '[data-column-key="discount_percentage"] .posa-cart-table__editor-display',
};

export const focusCartItemField = (
	container: ParentNode | null | undefined,
	rowIndex: number,
	field: CartShortcutField,
	options: CartFieldFocusOptions = {},
) => {
	if (!container || rowIndex < 0) {
		return false;
	}

	const rows = container.querySelectorAll?.(".posa-cart-item-row");
	const row = rows?.[rowIndex] as HTMLElement | undefined;
	if (!row) {
		return false;
	}

	row.scrollIntoView?.({ block: "nearest" });

	const activator = row.querySelector(FIELD_SELECTORS[field]) as HTMLElement | null;
	if (!activator) {
		return false;
	}

	activator.focus?.();
	if (options.activate !== false) {
		activator.click?.();
	}
	return true;
};
