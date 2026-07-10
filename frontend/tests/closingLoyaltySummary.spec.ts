import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { useClosingSummary } from "../src/posapp/composables/pos/closing/useClosingSummary";

const formatters = {
	formatCurrencyWithSymbol: (value: number, currency: string) => `${currency} ${value.toFixed(2)}`,
	formatCount: (value: number) => String(value),
	formatCurrency: (value: number) => value.toFixed(2),
	currencySymbol: (currency: string) => currency,
	__: (text: string) => text,
};

describe("useClosingSummary loyalty redemption", () => {
	it("shows loyalty redemption as a separate non-payment closing insight", () => {
		const overview = ref({
			company_currency: "PKR",
			total_invoices: 1,
			sales_summary: {
				gross_company_currency_total: 120,
				net_company_currency_total: 120,
				average_invoice_value: 120,
				sale_invoices_count: 1,
			},
			loyalty_redemption: {
				count: 1,
				points: 2,
				company_currency_total: 20,
				by_currency: [
					{
						currency: "PKR",
						total: 20,
						company_currency_total: 20,
						points: 2,
						invoice_count: 1,
					},
				],
			},
			cash_expected: {
				mode_of_payment: "Cash",
				company_currency_total: 100,
				by_currency: [],
			},
		});

		const summary = useClosingSummary(overview, ref({}), ref({}), formatters);

		expect(summary.loyaltyRedemptionSummary.value.company_currency_total).toBe(20);
		expect(summary.loyaltyRedemptionByCurrency.value[0].points).toBe(2);
		expect(summary.secondaryInsights.value).toContainEqual(
			expect.objectContaining({
				key: "loyalty-redemption",
				value: "PKR 20.00",
				caption: "Points: 2",
			}),
		);
		expect(summary.paymentsByMode.value).toEqual([]);
	});
});
