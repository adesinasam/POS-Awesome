import { describe, expect, it, vi } from "vitest";

vi.mock("../src/offline/index", () => ({
	isOffline: () => false,
}));

vi.mock("../src/posapp/stores/toastStore.js", () => ({
	useToastStore: () => ({
		show: vi.fn(),
	}),
}));

import { useStockUtils } from "../src/posapp/composables/pos/shared/useStockUtils";

describe("useStockUtils calcUom", () => {
	it("refreshes invoice totals after applying a UOM-specific price", async () => {
		const item = {
			item_code: "ITEM-UOM",
			item_name: "UOM Item",
			stock_uom: "Nos",
			uom: "Nos",
			item_uoms: [
				{ uom: "Nos", conversion_factor: 1 },
				{ uom: "Box", conversion_factor: 12 },
			],
			qty: 2,
			rate: 10,
			amount: 20,
			base_amount: 20,
			price_list_rate: 10,
			base_rate: 10,
			base_price_list_rate: 10,
			conversion_factor: 1,
			discount_amount: 0,
			discount_percentage: 0,
		};
		const triggerUpdateTotals = vi.fn();

		(globalThis as any).frappe = {
			call: vi.fn(async () => ({ message: 120 })),
		};
		(globalThis as any).__ = (text: string) => text;

		const { calcUom } = useStockUtils();
		await calcUom(item, "Box", {
			pos_profile: { currency: "PKR" },
			company: { default_currency: "PKR" },
			selected_currency: "PKR",
			price_list_currency: "PKR",
			currency_precision: 2,
			flt: (value: unknown, precision = 2) => {
				const numeric = Number(value);
				return Number.isFinite(numeric) ? Number(numeric.toFixed(precision)) : 0;
			},
			get_price_list: () => "Standard Selling",
			invoiceStore: {
				triggerUpdateTotals,
			},
			calc_stock_qty: (target: any, qty: number) => {
				target.stock_qty = target.conversion_factor * qty;
			},
			forceUpdate: vi.fn(),
		});

		expect(item.uom).toBe("Box");
		expect(item.conversion_factor).toBe(12);
		expect(item.rate).toBe(120);
		expect(item.amount).toBe(240);
		expect(item.base_amount).toBe(240);
		expect(item.stock_qty).toBe(24);
		expect(triggerUpdateTotals).toHaveBeenCalledTimes(1);
	});

	it("refreshes stale line amount after conversion-factor UOM changes", async () => {
		const item = {
			item_code: "ITEM-UOM-CONVERSION",
			item_name: "Conversion UOM Item",
			stock_uom: "Unit",
			uom: "Unit",
			item_uoms: [
				{ uom: "Doz", conversion_factor: 12 },
				{ uom: "Unit", conversion_factor: 1 },
			],
			qty: 1,
			rate: 120,
			amount: 120,
			base_amount: 120,
			price_list_rate: 120,
			base_rate: 120,
			base_price_list_rate: 120,
			original_base_rate: 120,
			original_base_price_list_rate: 120,
			conversion_factor: 1,
			discount_amount: 0,
			discount_percentage: 0,
		};
		const triggerUpdateTotals = vi.fn();

		(globalThis as any).frappe = {
			call: vi.fn(async () => ({ message: null })),
		};
		(globalThis as any).__ = (text: string) => text;

		const { calcUom } = useStockUtils();
		await calcUom(item, "Doz", {
			pos_profile: { currency: "PKR" },
			company: { default_currency: "PKR" },
			selected_currency: "PKR",
			price_list_currency: "PKR",
			currency_precision: 2,
			flt: (value: unknown, precision = 2) => {
				const numeric = Number(value);
				return Number.isFinite(numeric) ? Number(numeric.toFixed(precision)) : 0;
			},
			get_price_list: () => "Retail Selling",
			invoiceStore: {
				touch: vi.fn(),
				triggerUpdateTotals,
			},
			calc_stock_qty: (target: any, qty: number) => {
				target.stock_qty = target.conversion_factor * qty;
			},
			forceUpdate: vi.fn(),
		});

		expect(item.uom).toBe("Doz");
		expect(item.conversion_factor).toBe(12);
		expect(item.rate).toBe(1440);
		expect(item.amount).toBe(1440);
		expect(item.base_amount).toBe(1440);
		expect(item.stock_qty).toBe(12);
		expect(triggerUpdateTotals).toHaveBeenCalledTimes(1);
	});
});
