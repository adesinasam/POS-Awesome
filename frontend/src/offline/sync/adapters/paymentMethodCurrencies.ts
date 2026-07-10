import { savePaymentMethodCurrencyCache } from "../../cache";
import {
	buildResourceSyncResult,
	persistResourceSyncState,
	refreshSnapshotFromSync,
	type ResourceSyncResult,
	type SyncResponse,
	type SyncScopedProfile,
} from "./common";

type PaymentMethodFetcher = (args: {
	posProfile: SyncScopedProfile;
	watermark?: string | null;
	schemaVersion?: string | null;
}) => Promise<SyncResponse>;

type PaymentMethodSyncArgs = {
	posProfile: SyncScopedProfile;
	watermark?: string | null;
	schemaVersion?: string | null;
	fetcher: PaymentMethodFetcher;
};

export async function syncPaymentMethodCurrenciesResource(
	args: PaymentMethodSyncArgs,
): Promise<ResourceSyncResult> {
	const response = await args.fetcher({
		posProfile: args.posProfile,
		watermark: args.watermark,
		schemaVersion: args.schemaVersion,
	});

	if (response?.full_resync_required) {
		refreshSnapshotFromSync({
			posProfile: args.posProfile,
			cacheState: {
				paymentMethodCurrencyCount: 0,
			},
		});
		await persistResourceSyncState({
			resourceId: "payment_method_currencies",
			status: "limited",
			posProfile: args.posProfile,
			response,
			watermark: args.watermark,
		});
		return buildResourceSyncResult(
			"payment_method_currencies",
			"limited",
			response,
			args.watermark,
		);
	}

	const paymentMethodChange = (response?.changes || []).find(
		(entry) => entry?.key === "payment_method_currencies",
	);
	if (paymentMethodChange?.data) {
		const mapping = paymentMethodChange.data.mapping || {};
		savePaymentMethodCurrencyCache(args.posProfile.company || "", mapping);
		refreshSnapshotFromSync({
			posProfile: args.posProfile,
			cacheState: {
				paymentMethodCurrencyCount: Object.keys(mapping).length,
			},
		});
	}

	await persistResourceSyncState({
		resourceId: "payment_method_currencies",
		status: "fresh",
		posProfile: args.posProfile,
		response,
		watermark: args.watermark,
	});
	return buildResourceSyncResult(
		"payment_method_currencies",
		"fresh",
		response,
		args.watermark,
	);
}
