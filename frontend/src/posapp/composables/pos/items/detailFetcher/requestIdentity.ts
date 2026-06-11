type ItemLike = {
	item_code?: unknown;
};

type BuildItemDetailsRequestIdentityArgs = {
	posProfileName?: string | null;
	activePriceList?: string | null;
	priceListOverride?: string | null;
	items: Array<ItemLike | null | undefined>;
};

export type ItemDetailsRequestIdentity = {
	effectivePriceList: string;
	key: string;
};

export function buildItemDetailsRequestIdentity({
	posProfileName,
	activePriceList,
	priceListOverride = null,
	items,
}: BuildItemDetailsRequestIdentityArgs): ItemDetailsRequestIdentity {
	const effectivePriceList =
		typeof priceListOverride === "string" &&
		priceListOverride.trim().length
			? priceListOverride.trim()
			: activePriceList || "";
	const itemCodes = Array.from(
		new Set(
			items
				.map((item) =>
					item?.item_code !== undefined && item?.item_code !== null
						? String(item.item_code).trim()
						: undefined,
				)
				.filter(
					(code) =>
						code !== undefined && code !== "",
				),
		),
	)
		.sort();

	return {
		effectivePriceList,
		key: [posProfileName || "", effectivePriceList, itemCodes.join(",")].join(
			":",
		),
	};
}
