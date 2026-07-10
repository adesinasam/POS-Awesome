const __ = window.__ || ((text) => text);

export function formatPurchaseDate(value) {
	if (!value) return "";
	if (typeof frappe?.datetime?.str_to_user === "function") {
		return frappe.datetime.str_to_user(value);
	}
	return value;
}

export function formatPurchaseAmount(value) {
	const amount = Number(value || 0);
	return amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function purchaseCurrencySymbol(currency) {
	if (!currency) return "";
	if (typeof get_currency_symbol === "function") {
		return get_currency_symbol(currency);
	}
	return currency;
}

function parseServerMessages(raw) {
	if (!raw) return "";
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed) && parsed.length) {
			const first = parsed[0];
			if (typeof first === "string") {
				return first.replace(/<[^>]*>/g, "").trim();
			}
		}
	} catch {
		return String(raw);
	}
	return "";
}

export function extractPurchaseServerError(error, fallback = __("Unable to complete purchase action")) {
	return (
		parseServerMessages(error?._server_messages) ||
		parseServerMessages(error?.responseJSON?._server_messages) ||
		error?.message ||
		error?.responseJSON?.message ||
		fallback
	);
}
