// @vitest-environment jsdom

import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toastShow = vi.fn();

vi.mock("../src/posapp/stores/toastStore", () => ({
	useToastStore: () => ({
		show: toastShow,
	}),
}));

import { useInvoicePrinting } from "../src/posapp/composables/pos/invoice/useInvoicePrinting";

describe("useInvoicePrinting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("__", (text: string) => text);
	});

	it("does not crash when the POS profile is still unavailable", async () => {
		const saveAndClearInvoice = vi.fn();
		const loadPrintPage = vi.fn();
		const { print_draft_invoice } = useInvoicePrinting(
			ref(null),
			loadPrintPage,
			saveAndClearInvoice,
			ref({ name: "DRAFT-0001" }),
		);

		await expect(print_draft_invoice()).resolves.toBeUndefined();

		expect(saveAndClearInvoice).not.toHaveBeenCalled();
		expect(loadPrintPage).not.toHaveBeenCalled();
		expect(toastShow).toHaveBeenCalledWith({
			title: "You are not allowed to print draft invoices",
			color: "error",
		});
	});

	it("prints the saved draft when draft printing is allowed", async () => {
		const saveAndClearInvoice = vi.fn(async () => ({
			name: "DRAFT-0002",
			doctype: "Sales Invoice",
		}));
		const loadPrintPage = vi.fn();
		const { print_draft_invoice } = useInvoicePrinting(
			ref({ posa_allow_print_draft_invoices: 1 }),
			loadPrintPage,
			saveAndClearInvoice,
			ref({ name: "DRAFT-0001" }),
		);

		await print_draft_invoice();

		expect(saveAndClearInvoice).toHaveBeenCalledTimes(1);
		expect(loadPrintPage).toHaveBeenCalledWith({
			doc: {
				name: "DRAFT-0002",
				doctype: "Sales Invoice",
			},
		});
		expect(toastShow).not.toHaveBeenCalled();
	});

	it("does not throw when the save callback is missing", async () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const loadPrintPage = vi.fn();
		const { print_draft_invoice } = useInvoicePrinting(
			ref({ posa_allow_print_draft_invoices: 1 }),
			loadPrintPage,
			undefined as any,
			ref({ name: "DRAFT-0003" }),
		);

		await expect(print_draft_invoice()).resolves.toBeUndefined();

		expect(loadPrintPage).not.toHaveBeenCalled();
		expect(toastShow).toHaveBeenCalledWith({
			title: "Unable to print draft invoice",
			color: "error",
		});
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});
});
