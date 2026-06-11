import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchDraftInvoicesMock = vi.fn();
const fetchDocumentSourceRecordsMock = vi.fn();

vi.mock("../src/posapp/utils/draftInvoices", () => ({
	fetchDraftInvoices: (...args: unknown[]) => fetchDraftInvoicesMock(...args),
}));

vi.mock("../src/posapp/utils/documentSources", () => ({
	fetchDocumentSourceRecords: (...args: unknown[]) =>
		fetchDocumentSourceRecordsMock(...args),
	getDefaultDocumentSource: (_profile: unknown, source?: string) =>
		source || "invoice",
	loadDocumentSourceRecord: vi.fn(),
}));

import {
	get_draft_invoices,
	open_invoice_management,
} from "../src/posapp/components/pos/invoice_utils/dialogs";

describe("get_draft_invoices", () => {
	beforeEach(() => {
		fetchDraftInvoicesMock.mockReset();
		fetchDocumentSourceRecordsMock.mockReset();
		(globalThis as any).__ = (value: string) => value;
	});

	it("hydrates cached drafts and opens the summary drafts surface instead of the legacy dialog", async () => {
		const drafts = [{ name: "ACC-SINV-0001" }];
		const context = {
			pos_opening_shift: { name: "POS-OPEN-0001" },
			pos_profile: { name: "Main POS" },
			uiStore: {
				setDraftsData: vi.fn(),
				setParkedOrders: vi.fn(),
				closeDrafts: vi.fn(),
			},
			$refs: {
				invoiceSummary: {
					openDraftsSurface: vi.fn(),
				},
			},
			$nextTick: vi.fn().mockResolvedValue(undefined),
			toastStore: {
				show: vi.fn(),
			},
		};

		fetchDocumentSourceRecordsMock.mockResolvedValue(drafts);

		await get_draft_invoices(context);

		expect(context.uiStore.setDraftsData).toHaveBeenCalledWith(drafts);
		expect(context.uiStore.setParkedOrders).toHaveBeenCalledWith(drafts);
		expect(context.uiStore.closeDrafts).toHaveBeenCalled();
		expect(context.$refs.invoiceSummary.openDraftsSurface).toHaveBeenCalled();
	});

	it("clears cached drafts without opening any drafts surface when no drafts exist", async () => {
		const context = {
			pos_opening_shift: { name: "POS-OPEN-0001" },
			pos_profile: { name: "Main POS" },
			uiStore: {
				setDraftsData: vi.fn(),
				setParkedOrders: vi.fn(),
				closeDrafts: vi.fn(),
			},
			$refs: {
				invoiceSummary: {
					openDraftsSurface: vi.fn(),
				},
			},
			$nextTick: vi.fn().mockResolvedValue(undefined),
			toastStore: {
				show: vi.fn(),
			},
		};

		fetchDocumentSourceRecordsMock.mockResolvedValue([]);

		await get_draft_invoices(context);

		expect(context.uiStore.setDraftsData).toHaveBeenCalledWith([]);
		expect(context.uiStore.setParkedOrders).toHaveBeenCalledWith([]);
		expect(context.uiStore.closeDrafts).toHaveBeenCalled();
		expect(context.$refs.invoiceSummary.openDraftsSurface).not.toHaveBeenCalled();
	});
});

describe("open_invoice_management", () => {
	it("forwards the requested target tab to invoice management", () => {
		const context = {
			uiStore: {
				openInvoiceManagement: vi.fn(),
			},
		};

		open_invoice_management(context, "drafts");

		expect(context.uiStore.openInvoiceManagement).toHaveBeenCalledWith(
			"drafts",
			"invoice",
		);
	});
});
