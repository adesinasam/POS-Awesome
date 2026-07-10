export function preferPricingRuleString(value: any): string {
	if (!value) {
		return "";
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) {
			return "";
		}
		if (
			(trimmed.startsWith("[") && trimmed.endsWith("]")) ||
			(trimmed.startsWith("{") && trimmed.endsWith("}"))
		) {
			try {
				return preferPricingRuleString(JSON.parse(trimmed));
			} catch {
				return trimmed;
			}
		}
		if (trimmed.includes(",")) {
			return (trimmed.split(",")[0] || "").trim();
		}
		return trimmed;
	}
	if (Array.isArray(value)) {
		for (const entry of value) {
			const resolved = preferPricingRuleString(entry);
			if (resolved) {
				return resolved;
			}
		}
		return "";
	}
	if (typeof value === "object") {
		return value.name || value.rule || value.pricing_rule || value.pricingRule || "";
	}
	return "";
}

export function resolvePricingRuleName(line: any): string {
	return preferPricingRuleString(line?.source_rule || line?.pricing_rule || line?.pricing_rules);
}
