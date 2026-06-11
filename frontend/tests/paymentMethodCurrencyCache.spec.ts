import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getCachedPaymentMethodCurrencyMap,
	savePaymentMethodCurrencyCache,
} from "../src/offline/cache";
import { loadPaymentMethodCurrencyMap } from "../src/posapp/utils/paymentMethodCurrencyCache";

describe("payment method currency cache", () => {
	beforeEach(() => {
		savePaymentMethodCurrencyCache("Test Company", {});
	});

	it("falls back to cached mapping when the live fetch fails", async () => {
		savePaymentMethodCurrencyCache("Test Company", {
			Cash: "PKR",
			Card: "USD",
		});

		const result = await loadPaymentMethodCurrencyMap({
			company: "Test Company",
			fetcher: vi.fn().mockRejectedValue(new Error("offline")),
		});

		expect(result).toEqual({
			Cash: "PKR",
			Card: "USD",
		});
	});

	it("persists live mapping responses for later offline use", async () => {
		const result = await loadPaymentMethodCurrencyMap({
			company: "Test Company",
			fetcher: vi.fn().mockResolvedValue({
				Cash: "PKR",
			}),
		});

		expect(result).toEqual({
			Cash: "PKR",
		});
		expect(getCachedPaymentMethodCurrencyMap("Test Company")).toEqual({
			Cash: "PKR",
		});
	});
});
