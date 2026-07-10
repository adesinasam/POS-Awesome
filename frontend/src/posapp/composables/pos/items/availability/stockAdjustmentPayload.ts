export type StockAdjustmentBaseEntry = {
	item_code: string;
	actual_qty: number;
};

type ItemCodeCarrier = {
	item_code?: unknown;
};

export function normalizeInvoiceStockAdjustmentPayload(
	payload: unknown = {},
): {
	baseEntries: StockAdjustmentBaseEntry[];
	codes: string[];
} {
	const payloadItems =
		payload &&
		typeof payload === "object" &&
		Array.isArray((payload as { items?: unknown }).items)
			? (payload as { items: unknown[] }).items
			: [];

	const baseEntries = payloadItems
		.map((entry) => normalizeBaseEntry(entry))
		.filter((entry): entry is StockAdjustmentBaseEntry => !!entry);

	const collectedCodes = new Set<string>();
	const collectCode = (code: unknown) => {
		if (typeof code !== "string" && typeof code !== "number") return;
		const normalized =
			typeof code === "string" ? code.trim() : String(code).trim();
		if (normalized) collectedCodes.add(normalized);
	};
	const collectFromItems = (items: unknown) => {
		if (!Array.isArray(items)) return;
		items.forEach((entry) => {
			if (!entry) return;
			if (typeof entry === "string" || typeof entry === "number") {
				collectCode(entry);
			} else if ((entry as ItemCodeCarrier).item_code !== undefined) {
				collectCode((entry as ItemCodeCarrier).item_code);
			}
		});
	};

	if (Array.isArray(payload)) {
		collectFromItems(payload);
	} else if (payload && typeof payload === "object") {
		const payloadObj = payload as {
			items?: unknown;
			item_codes?: unknown;
			item_code?: unknown;
		};
		collectFromItems(payloadObj.items);
		collectFromItems(payloadObj.item_codes);
		if (payloadObj.item_code !== undefined) {
			collectCode(payloadObj.item_code);
		}
	} else {
		collectCode(payload);
	}

	return {
		baseEntries,
		codes: Array.from(collectedCodes),
	};
}

function normalizeBaseEntry(entry: unknown): StockAdjustmentBaseEntry | null {
	if (!entry) return null;
	const source = entry as { item_code?: unknown; actual_qty?: unknown };
	const item_code =
		typeof source.item_code === "string"
			? source.item_code.trim()
			: typeof source.item_code === "number"
				? String(source.item_code).trim()
				: "";
	const rawQty = source.actual_qty;
	const actual_qty =
		typeof rawQty === "number" ||
		(typeof rawQty === "string" && rawQty.trim().length > 0)
			? Number(rawQty)
			: Number.NaN;
	if (!item_code || !Number.isFinite(actual_qty)) {
		return null;
	}
	return {
		item_code,
		actual_qty,
	};
}
