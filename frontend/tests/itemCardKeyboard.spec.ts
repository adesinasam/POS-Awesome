// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import ItemCard from "../src/posapp/components/pos/items/ItemCard.vue";

const baseProps = {
	item: {
		item_code: "ITEM-001",
		item_name: "Paracetamol",
		actual_qty: 12,
		rate: 25,
	},
	posProfile: {
		currency: "PKR",
		posa_allow_multi_currency: false,
	},
	context: "pos",
	selectedCurrency: "",
	selectedExchangeRate: 1,
	selectedConversionRate: 1,
	hideQtyDecimals: false,
	showRateInfo: false,
	getItemRateInfo: vi.fn(() => null),
	isItemHighlighted: false,
	currencySymbol: () => "Rs ",
	formatCurrency: (value: number) => String(value),
	formatNumber: (value: number) => String(value),
	ratePrecision: () => 2,
	isNegative: (value: number) => value < 0,
};

describe("ItemCard keyboard control", () => {
	it("renders item cards as focusable keyboard targets", async () => {
		const wrapper = shallowMount(ItemCard, {
			props: baseProps,
			global: {
				stubs: {
					VImg: { template: "<div><slot name=\"placeholder\" /></div>" },
					VIcon: { template: "<span />" },
					ItemRateInfoMenu: { template: "<span />" },
				},
			},
		});

		const card = wrapper.get(".card-item-card");
		expect(card.attributes("tabindex")).toBe("0");
		expect(card.attributes("role")).toBe("button");
		expect(card.attributes("data-pos-keyboard-target")).toBe("item-card");

		expect(card.attributes("aria-label")).toBe("Paracetamol");
	});
});
