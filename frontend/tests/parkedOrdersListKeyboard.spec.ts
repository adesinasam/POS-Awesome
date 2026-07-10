// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import ParkedOrdersList from "../src/posapp/components/pos/invoice/ParkedOrdersList.vue";

const drafts = [
	{
		name: "ACC-SINV-0001",
		customer_name: "Walk-in Customer",
		posting_date: "2026-07-08",
		posting_time: "10:00:00.000000",
		grand_total: 125,
		currency: "PKR",
	},
	{
		name: "ACC-SINV-0002",
		customer_name: "MedPlus Customer",
		posting_date: "2026-07-08",
		posting_time: "10:05:00.000000",
		grand_total: 250,
		currency: "PKR",
	},
];

describe("ParkedOrdersList keyboard control", () => {
	beforeEach(() => {
		vi.stubGlobal("__", (value: string) => value);
	});

	afterEach(() => {
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
	});

	function mountList() {
		const onResume = vi.fn();
		const onClose = vi.fn();
		const wrapper = mount(ParkedOrdersList, {
			attachTo: document.body,
			props: {
				parkedOrders: drafts,
				formatCurrency: (value: number) => String(value),
				currencySymbol: () => "Rs ",
				showManageAll: true,
				onResume,
				onClose,
			},
			global: {
				stubs: {
					VBtn: {
						template: "<button type=\"button\"><slot /></button>",
					},
					VProgressCircular: {
						template: "<span />",
					},
				},
			},
		});
		return { wrapper, onResume, onClose };
	}

	it("focuses drafts and opens the selected row with arrow keys and Enter", async () => {
		const { wrapper, onResume } = mountList();

		await (wrapper.vm as any).focusFirstDraft();

		const cards = wrapper.findAll(".drafts-list__card");
		expect(document.activeElement).toBe(cards[0].element);

		await cards[0].trigger("keydown", { key: "ArrowDown" });
		expect(document.activeElement).toBe(cards[1].element);

		await cards[1].trigger("keydown", { key: "Enter" });

		expect(onResume).toHaveBeenCalledWith(drafts[1]);
	});

	it("closes from Escape without opening a draft", async () => {
		const { wrapper, onResume, onClose } = mountList();

		await (wrapper.vm as any).focusFirstDraft();
		const cards = wrapper.findAll(".drafts-list__card");
		await cards[0].trigger("keydown", { key: "Escape" });

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onResume).not.toHaveBeenCalled();
	});
});
