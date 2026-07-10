import { ref } from "vue";
import type { Item, POSProfile } from "../../../../types/models";

export function useItemsSearch() {
	const itemsMap = ref(new Map<string, Item>()); // O(1) lookup by item_code
	const barcodeIndex = ref(new Map<string, Item>()); // O(1) barcode lookup

	const normalizeSearchText = (value: unknown): string =>
		String(value || "")
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase();

	const registerLookupValue = (
		index: Map<string, Item>,
		value: unknown,
		item: Item,
	) => {
		const raw = String(value || "").trim();
		if (!raw) {
			return;
		}
		index.set(raw, item);
		index.set(normalizeSearchText(raw), item);
	};

	const collectBarcodeValues = (item: Item): string[] => {
		const values: string[] = [];

		if (item.barcode) {
			values.push(String(item.barcode));
		}

		if (Array.isArray(item.item_barcode)) {
			item.item_barcode.forEach((entry: any) => {
				if (entry?.barcode) {
					values.push(String(entry.barcode));
				}
			});
		} else if (item.item_barcode) {
			values.push(String(item.item_barcode));
		}

		if (Array.isArray(item.barcodes)) {
			item.barcodes.forEach((entry: any) => {
				const barcode =
					entry && typeof entry === "object" ? entry.barcode : entry;
				if (barcode) {
					values.push(String(barcode));
				}
			});
		}

		return Array.from(new Set(values.filter(Boolean)));
	};

	const tokenizeSearchText = (value: unknown): string[] => {
		const normalized = normalizeSearchText(value)
			.replace(/[^a-z0-9]+/g, " ")
			.trim();
		if (!normalized) {
			return [];
		}
		return Array.from(new Set(normalized.split(/\s+/).filter(Boolean)));
	};

	const isNearTokenMatch = (query: string, token: string): boolean => {
		if (!query || !token) {
			return false;
		}
		if (token.includes(query) || query.includes(token)) {
			return true;
		}
		if (query.length < 4 || token.length < 4) {
			return false;
		}
		const maxDistance = Math.min(query.length, token.length) >= 7 ? 2 : 1;
		if (Math.abs(query.length - token.length) > maxDistance) {
			return false;
		}

		let previous = Array.from(
			{ length: token.length + 1 },
			(_, index) => index,
		);
		for (let i = 1; i <= query.length; i++) {
			const current: number[] = [i];
			let rowMin = i;
			for (let j = 1; j <= token.length; j++) {
				const substitutionCost =
					query[i - 1] === token[j - 1] ? 0 : 1;
				const next = Math.min(
					(current[j - 1] ?? i) + 1,
					(previous[j] ?? j) + 1,
					(previous[j - 1] ?? j - 1) + substitutionCost,
				);
				current[j] = next;
				rowMin = Math.min(rowMin, next);
			}
			if (rowMin > maxDistance) {
				return false;
			}
			previous = current;
		}

		return (previous[token.length] ?? Number.POSITIVE_INFINITY) <= maxDistance;
	};

	const normalizeBooleanSetting = (value: any): boolean => {
		if (typeof value === "string") {
			const normalized = value.trim().toLowerCase();
			return (
				normalized === "1" ||
				normalized === "true" ||
				normalized === "yes"
			);
		}

		if (typeof value === "number") {
			return value === 1;
		}

		return Boolean(value);
	};

	const updateIndexes = (itemList: Item[], posProfile: POSProfile | null) => {
		if (!Array.isArray(itemList)) {
			return;
		}

		const includeSerial = normalizeBooleanSetting(
			posProfile?.posa_search_serial_no,
		);
		const includeBatch = normalizeBooleanSetting(
			posProfile?.posa_search_batch_no,
		);

		itemList.forEach((item) => {
			if (!item || !item.item_code) {
				return;
			}
			registerLookupValue(itemsMap.value, item.item_code, item);
			registerLookupValue(barcodeIndex.value, item.item_code, item);
			collectBarcodeValues(item).forEach((barcode) =>
				registerLookupValue(barcodeIndex.value, barcode, item),
			);

			// Pre-compute search index for performance
			const searchFields = [
				item.item_code,
				item.item_name,
				item.barcode,
				item.description,
			];

			collectBarcodeValues(item).forEach((barcode) =>
				searchFields.push(barcode),
			);

			if (includeSerial && Array.isArray(item.serial_no_data)) {
				item.serial_no_data.forEach((s: any) =>
					searchFields.push(s?.serial_no),
				);
			}

			if (includeBatch && Array.isArray(item.batch_no_data)) {
				item.batch_no_data.forEach((b: any) =>
					searchFields.push(b?.batch_no),
				);
			}

			const normalizedFields = searchFields
				.filter(Boolean)
				.map((field) => normalizeSearchText(field));
			item._search_index = normalizedFields.join(" ");
			item._search_tokens = normalizedFields.flatMap(tokenizeSearchText);
		});
	};

	const resetIndexes = () => {
		itemsMap.value.clear();
		barcodeIndex.value.clear();
	};

	const performLocalSearch = (
		term: string,
		itemList: Item[],
		itemGroup: string,
	) => {
		if (!term) {
			return filterItemsByGroup(itemList, itemGroup);
		}

		const searchTerm = normalizeSearchText(term);
		const searchTerms = tokenizeSearchText(searchTerm);
		const normalizedGroup =
			typeof itemGroup === "string" && itemGroup.length > 0
				? itemGroup
				: "ALL";

		return itemList.filter((item) => {
			if (!item) {
				return false;
			}
			if (
				normalizedGroup !== "ALL" &&
				(!item.item_group ||
					item.item_group.toLowerCase() !==
						normalizedGroup.toLowerCase())
			) {
				return false;
			}

			// Use pre-computed search index if available
			if (item._search_index) {
				const tokens = Array.isArray(item._search_tokens)
					? item._search_tokens
					: tokenizeSearchText(item._search_index);
				return searchTerms.every((searchToken) => {
					if (item._search_index!.includes(searchToken)) {
						return true;
					}
					return tokens.some((token) =>
						isNearTokenMatch(searchToken, String(token)),
					);
				});
			}

			// Fallback for items without index
			const fields = [
				item.item_code,
				item.item_name,
				item.barcode,
				item.description,
			];

			if (Array.isArray(item.item_barcode)) {
				item.item_barcode.forEach((entry: any) =>
					fields.push(entry?.barcode),
				);
			} else if (item.item_barcode) {
				fields.push(String(item.item_barcode));
			}

			if (Array.isArray(item.barcodes)) {
				item.barcodes.forEach((code: string) => fields.push(code));
			}

			return fields
				.filter(Boolean)
				.some((field) => {
					const fieldIndex = normalizeSearchText(field);
					if (fieldIndex.includes(searchTerm)) {
						return true;
					}
					const tokens = tokenizeSearchText(fieldIndex);
					return searchTerms.every((searchToken) =>
						tokens.some((token) =>
							isNearTokenMatch(searchToken, token),
						),
					);
				});
		});
	};

	const scoreLocalMatch = (
		item: Item,
		searchTerm: string,
		searchTerms: string[],
	): number => {
		const normalizedCode = normalizeSearchText(item.item_code);
		const normalizedName = normalizeSearchText(item.item_name);
		const normalizedBarcodes = collectBarcodeValues(item).map((barcode) =>
			normalizeSearchText(barcode),
		);

		if (normalizedCode === searchTerm) return 1000;
		if (normalizedBarcodes.includes(searchTerm)) return 950;
		if (normalizedCode.startsWith(searchTerm)) return 800;
		if (normalizedName.startsWith(searchTerm)) return 700;
		if (
			searchTerms.length &&
			searchTerms.every((token) =>
				tokenizeSearchText(item.item_name || "").some((nameToken) =>
					nameToken.startsWith(token),
				),
			)
		) {
			return 650;
		}
		if (item._search_index?.includes(searchTerm)) return 500;
		return 100;
	};

	const performRankedLocalSearch = (
		term: string,
		itemList: Item[],
		itemGroup: string,
		limit = 50,
	) => {
		const matches = performLocalSearch(term, itemList, itemGroup);
		if (!term || !matches.length) {
			return Number.isFinite(limit) && limit > 0
				? matches.slice(0, limit)
				: matches;
		}

		const searchTerm = normalizeSearchText(term);
		const searchTerms = tokenizeSearchText(searchTerm);
		return matches
			.map((item, originalIndex) => ({
				item,
				originalIndex,
				score: scoreLocalMatch(item, searchTerm, searchTerms),
			}))
			.sort(
				(left, right) =>
					right.score - left.score ||
					left.originalIndex - right.originalIndex,
			)
			.slice(0, limit)
			.map(({ item }) => item);
	};

	const filterItemsByGroup = (itemList: Item[], group: string) => {
		const normalizedGroup =
			typeof group === "string" && group.length > 0 ? group : "ALL";
		if (normalizedGroup === "ALL") {
			return itemList;
		}
		return itemList.filter((item) => item.item_group === normalizedGroup);
	};

	const getItemByCode = (itemCode: string) => {
		return (
			itemsMap.value.get(itemCode) ||
			itemsMap.value.get(normalizeSearchText(itemCode))
		);
	};

	const getItemByBarcode = (barcode: string) => {
		return (
			barcodeIndex.value.get(barcode) ||
			barcodeIndex.value.get(normalizeSearchText(barcode))
		);
	};

	return {
		itemsMap,
		barcodeIndex,
		updateIndexes,
		resetIndexes,
		performLocalSearch,
		performRankedLocalSearch,
		filterItemsByGroup,
		getItemByCode,
		getItemByBarcode,
	};
}
