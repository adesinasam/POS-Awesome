import { describe, expect, it } from "vitest";

import { resolvePaymentPrintFormat } from "../src/posapp/utils/paymentPrintFormat";

describe("resolvePaymentPrintFormat", () => {
	it("prefers a matching customer-group print format rule", () => {
		const result = resolvePaymentPrintFormat({
			profile: {
				print_format_for_online: "Online Standard",
				print_format: "Standard",
				posa_print_format_rules: [
					{ customer_group: "Retail", print_format: "Retail Format" },
				],
			},
			customerInfo: {
				customer_group: "Retail",
			},
			availableFormats: ["Retail Format", "Online Standard", "Standard"],
		});

		expect(result).toBe("Retail Format");
	});

	it("falls back to the POS Profile online/default print format before the first option", () => {
		const result = resolvePaymentPrintFormat({
			profile: {
				print_format_for_online: "Online Standard",
				print_format: "Standard",
			},
			customerInfo: null,
			availableFormats: ["Compact", "Online Standard", "Standard"],
		});

		expect(result).toBe("Online Standard");
	});

	it("uses the first available format when the profile defaults are missing", () => {
		const result = resolvePaymentPrintFormat({
			profile: {},
			customerInfo: null,
			availableFormats: ["Compact", "Standard"],
		});

		expect(result).toBe("Compact");
	});
});
