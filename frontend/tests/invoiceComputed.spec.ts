import { afterEach, describe, expect, it } from "vitest";

import invoiceComputed from "../src/posapp/components/pos/invoice/invoiceComputed";

const round = (value: unknown, precision = 2) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? Number(numeric.toFixed(precision)) : 0;
};

const createContext = (overrides: Record<string, unknown> = {}) => ({
	items: [
		{ qty: 2, rate: 25, discount_amount: 3 },
		{ qty: "1.5", rate: "10", discount_amount: "2" },
	],
	flt: round,
	float_precision: 2,
	currency_precision: 2,
	additional_discount: 5,
	delivery_charges_rate: 7,
	posting_date: "2026-05-07",
	selected_currency: "PKR",
	pos_profile: { currency: "PKR" },
	invoiceType: "Invoice",
	invoice_doc: {},
	isReturnInvoice: false,
	...overrides,
});

describe("invoiceComputed totals", () => {
	afterEach(() => {
		delete (globalThis as any).flt;
	});

	it("uses the component flt helper instead of a global flt", () => {
		(globalThis as any).flt = "not-a-function";
		const context = createContext();

		expect((invoiceComputed.total_qty as Function).call(context)).toBe(3.5);
		expect((invoiceComputed.Total as Function).call(context)).toBe(65);
		expect((invoiceComputed.subtotal as Function).call(context)).toBe(67);
		expect(
			(invoiceComputed.total_items_discount_amount as Function).call(context),
		).toBe(9);
	});

	it("uses store metrics when they are available", () => {
		const context = createContext({
			invoiceStore: {
				totalQty: { value: 4 },
				grossTotal: { value: 100 },
				discountTotal: { value: -12 },
			},
		});

		expect((invoiceComputed.total_qty as Function).call(context)).toBe(4);
		expect((invoiceComputed.Total as Function).call(context)).toBe(100);
		expect((invoiceComputed.subtotal as Function).call(context)).toBe(102);
		expect(
			(invoiceComputed.total_items_discount_amount as Function).call(context),
		).toBe(12);
	});
});
