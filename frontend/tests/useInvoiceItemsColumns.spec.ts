// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";

vi.mock("../src/posapp/stores/toastStore", () => ({
	useToastStore: () => ({
		show: vi.fn(),
	}),
}));

vi.mock("../src/posapp/composables/pos/shared/useStockUtils", () => ({
	useStockUtils: () => ({
		calc_stock_qty: vi.fn(),
	}),
}));

vi.mock("../src/posapp/composables/pos/items/useItemAddition", () => ({
	useItemAddition: () => ({
		removeItem: vi.fn(),
		addItem: vi.fn(),
	}),
}));

vi.mock("../src/offline/index", () => ({
	getCachedDeliveryCharges: vi.fn(() => []),
	saveDeliveryChargesCache: vi.fn(),
}));

describe("useInvoiceItems column preferences", () => {
	beforeEach(() => {
		vi.resetModules();
		setActivePinia(createPinia());
		localStorage.clear();
		(window as any).__ = (value: string) => value;
		(globalThis as any).__ = (value: string) => value;
		(globalThis as any).flt = (value: any) => Number(value || 0);
		(window as any).frappe = {
			defaults: {
				get_default: vi.fn(() => "2"),
			},
			datetime: {
				nowdate: vi.fn(() => "2026-07-10"),
			},
		};
		(globalThis as any).frappe = (window as any).frappe;
	});

	it("updates optional cart columns and persists only valid optional keys", async () => {
		const { useInvoiceItems } = await import(
			"../src/posapp/composables/pos/invoice/useInvoiceItems"
		);
		const invoiceItems = useInvoiceItems(ref("Invoice"));

		invoiceItems.setSelectedColumns([
			"uom",
			"price_list_rate",
			"item_name",
			"discount_value",
			"unknown_column",
		]);
		invoiceItems.saveColumnPreferences();

		expect(invoiceItems.selected_columns.value).toEqual([
			"uom",
			"price_list_rate",
			"discount_percentage",
		]);
		expect(invoiceItems.items_headers.value.map((column) => column.key)).toEqual(
			expect.arrayContaining([
				"item_name",
				"qty",
				"uom",
				"price_list_rate",
				"discount_percentage",
				"rate",
				"amount",
				"actions",
			]),
		);
		expect(localStorage.getItem("posawesome_selected_columns")).toBe(
			JSON.stringify(["uom", "price_list_rate", "discount_percentage"]),
		);
	});
});
