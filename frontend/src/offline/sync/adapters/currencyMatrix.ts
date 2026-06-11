import {
	saveCurrencyOptionsCache,
	saveExchangeRateCache,
} from "../../cache";
import {
	buildResourceSyncResult,
	persistResourceSyncState,
	refreshSnapshotFromSync,
	type ResourceSyncResult,
	type SyncResponse,
	type SyncScopedProfile,
} from "./common";

type CurrencyPair = {
	from_currency: string;
	to_currency: string;
};

type CurrencyMatrixFetcher = (args: {
	posProfile: SyncScopedProfile;
	currencyPairs?: CurrencyPair[];
	watermark?: string | null;
	schemaVersion?: string | null;
}) => Promise<SyncResponse>;

type CurrencyMatrixSyncArgs = {
	posProfile: SyncScopedProfile;
	currencyPairs?: CurrencyPair[];
	watermark?: string | null;
	schemaVersion?: string | null;
	fetcher: CurrencyMatrixFetcher;
};

export async function syncCurrencyMatrixResource(
	args: CurrencyMatrixSyncArgs,
): Promise<ResourceSyncResult> {
	const response = await args.fetcher({
		posProfile: args.posProfile,
		currencyPairs: args.currencyPairs || [],
		watermark: args.watermark,
		schemaVersion: args.schemaVersion,
	});

	if (response?.full_resync_required) {
		refreshSnapshotFromSync({
			posProfile: args.posProfile,
			cacheState: {
				currencyOptionsCount: 0,
				exchangeRateCount: 0,
			},
		});
		await persistResourceSyncState({
			resourceId: "currency_matrix",
			status: "limited",
			posProfile: args.posProfile,
			response,
			watermark: args.watermark,
		});
		return buildResourceSyncResult(
			"currency_matrix",
			"limited",
			response,
			args.watermark,
		);
	}

	let currencyOptionsCount: number | undefined;
	let exchangeRateCount = 0;

	for (const change of response?.changes || []) {
		if (change?.key === "currency_options" && Array.isArray(change.data)) {
			saveCurrencyOptionsCache(args.posProfile.name, change.data);
			currencyOptionsCount = change.data.length;
			continue;
		}

		if (!String(change?.key || "").startsWith("exchange_rate::")) {
			continue;
		}

		const rate = change?.data || {};
		saveExchangeRateCache({
			profileName: args.posProfile.name,
			company: args.posProfile.company || undefined,
			fromCurrency: rate.from_currency,
			toCurrency: rate.to_currency,
			date: rate.date,
			exchange_rate: rate.exchange_rate,
		});
		exchangeRateCount += 1;
	}

	if (
		typeof currencyOptionsCount !== "undefined" ||
		exchangeRateCount > 0
	) {
		refreshSnapshotFromSync({
			posProfile: args.posProfile,
			cacheState: {
				...(typeof currencyOptionsCount !== "undefined"
					? { currencyOptionsCount }
					: {}),
				...(exchangeRateCount > 0 ? { exchangeRateCount } : {}),
			},
		});
	}

	await persistResourceSyncState({
		resourceId: "currency_matrix",
		status: "fresh",
		posProfile: args.posProfile,
		response,
		watermark: args.watermark,
	});
	return buildResourceSyncResult(
		"currency_matrix",
		"fresh",
		response,
		args.watermark,
	);
}
