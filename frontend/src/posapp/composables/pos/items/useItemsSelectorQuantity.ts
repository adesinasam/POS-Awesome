import { computed, ref, type Ref } from "vue";

type UseItemsSelectorQuantityArgs = {
	hideQtyDecimals: Ref<boolean>;
	initialQty?: number;
};

export function useItemsSelectorQuantity({
	hideQtyDecimals,
	initialQty = 1,
}: UseItemsSelectorQuantityArgs) {
	const qty = ref<number | null>(initialQty);

	const debounceQty = computed({
		get() {
			if (qty.value === null) return "";
			return hideQtyDecimals.value ? Math.round(qty.value) : qty.value;
		},
		set(value: unknown) {
			const rawValue = String(value ?? "").trim();
			const lastDot = rawValue.lastIndexOf(".");
			const lastComma = rawValue.lastIndexOf(",");
			const decimalSeparator =
				lastDot >= 0 || lastComma >= 0
					? lastDot > lastComma
						? "."
						: ","
					: "";
			let normalized = rawValue;
			if (decimalSeparator) {
				const groupingSeparator = decimalSeparator === "." ? "," : ".";
				normalized = normalized
					.replace(new RegExp(`\\${groupingSeparator}`, "g"), "")
					.replace(decimalSeparator, ".");
			}
			let parsed: number | null = parseFloat(normalized);
			if (Number.isNaN(parsed)) parsed = null;
			if (hideQtyDecimals.value && parsed != null) parsed = Math.round(parsed);
			qty.value = parsed;
		},
	});

	const clearQty = () => {
		qty.value = null;
	};

	const onQtyBlur = () => {
		if (!qty.value || qty.value <= 0) {
			qty.value = 1;
		}
	};

	return {
		qty,
		debounceQty,
		clearQty,
		onQtyBlur,
	};
}
