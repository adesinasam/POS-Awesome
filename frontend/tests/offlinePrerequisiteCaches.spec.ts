import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { db, KEY_TABLE_MAP } from "../src/offline/db";
import * as cache from "../src/offline/cache";

function installLocalStorageMock() {
	const storage = new Map<string, string>();
	const mockStorage = {
		getItem(key: string) {
			return storage.has(key) ? storage.get(key)! : null;
		},
		setItem(key: string, value: string) {
			storage.set(String(key), String(value));
		},
		removeItem(key: string) {
			storage.delete(String(key));
		},
		clear() {
			storage.clear();
		},
		key(index: number) {
			return Array.from(storage.keys())[index] ?? null;
		},
		get length() {
			return storage.size;
		},
	};

	Object.defineProperty(globalThis, "localStorage", {
		value: mockStorage,
		configurable: true,
	});
}

async function clearOfflineDb() {
	if (!db.isOpen()) {
		await db.open();
	}

	for (const table of db.tables) {
		await table.clear();
	}
}

describe("offline prerequisite caches", () => {
	beforeEach(async () => {
		installLocalStorageMock();
		localStorage.clear();
		await clearOfflineDb();
	});

	afterEach(async () => {
		localStorage.clear();
		await clearOfflineDb();
	});

	it("maps new prerequisite caches into offline storage", () => {
		expect(KEY_TABLE_MAP.delivery_charges_cache).toBe("cache");
		expect(KEY_TABLE_MAP.currency_options_cache).toBe("cache");
		expect(KEY_TABLE_MAP.exchange_rate_cache).toBe("cache");
		expect(KEY_TABLE_MAP.price_list_meta_cache).toBe("cache");
		expect(KEY_TABLE_MAP.customer_addresses_cache).toBe("cache");
		expect(KEY_TABLE_MAP.payment_method_currency_cache).toBe("cache");
	});

	it("exposes helper APIs for the new prerequisite caches", () => {
		expect(typeof cache.saveDeliveryChargesCache).toBe("function");
		expect(typeof cache.getCachedDeliveryCharges).toBe("function");
		expect(typeof cache.saveCurrencyOptionsCache).toBe("function");
		expect(typeof cache.getCachedCurrencyOptions).toBe("function");
		expect(typeof cache.saveExchangeRateCache).toBe("function");
		expect(typeof cache.getCachedExchangeRate).toBe("function");
		expect(typeof cache.savePriceListMetaCache).toBe("function");
		expect(typeof cache.getCachedPriceListMeta).toBe("function");
		expect(typeof cache.saveCustomerAddressesCache).toBe("function");
		expect(typeof cache.getCachedCustomerAddresses).toBe("function");
		expect(typeof cache.savePaymentMethodCurrencyCache).toBe("function");
		expect(typeof cache.getCachedPaymentMethodCurrencyMap).toBe("function");
	});

	it("reports non-zero usage for stored local cache payloads", async () => {
		localStorage.setItem("posa_usage_probe", "x".repeat(256));

		if (!db.isOpen()) {
			await db.open();
		}
		await db.table("cache").put({
			key: "usage_probe_cache",
			value: {
				payload: "y".repeat(512),
			},
		});

		const usage = await cache.getCacheUsageEstimate();

		expect(usage.localStorage).toBeGreaterThan(0);
		expect(usage.indexedDB).toBeGreaterThan(0);
		expect(usage.total).toBeGreaterThan(0);
	});
});
