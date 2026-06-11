import {
	savePriceListMetaCache,
	setTaxInclusiveSetting,
} from "../../cache";
import type { SyncLifecycleState } from "../types";
import {
	buildResourceSyncResult,
	persistResourceSyncState,
	refreshSnapshotFromSync,
	type ResourceSyncResult,
	type SyncResponse,
	type SyncScopedProfile,
} from "./common";

type BootCriticalFetcher = (args: {
	posProfile: SyncScopedProfile;
	watermark?: string | null;
	schemaVersion?: string | null;
}) => Promise<SyncResponse>;

type BootCriticalSyncArgs = {
	posProfile: SyncScopedProfile;
	watermark?: string | null;
	schemaVersion?: string | null;
	fetcher: BootCriticalFetcher;
};

function findChange(response: SyncResponse, key: string) {
	return (response?.changes || []).find((entry) => entry?.key === key) || null;
}

async function finalizeState(
	resourceId: "bootstrap_config" | "price_list_meta",
	status: SyncLifecycleState,
	args: BootCriticalSyncArgs,
	response: SyncResponse,
) {
	await persistResourceSyncState({
		resourceId,
		status,
		posProfile: args.posProfile,
		response,
		watermark: args.watermark,
	});
	return buildResourceSyncResult(resourceId, status, response, args.watermark);
}

export async function syncBootstrapConfigResource(
	args: BootCriticalSyncArgs,
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
				taxInclusive: null,
			},
		});
		return finalizeState("bootstrap_config", "limited", args, response);
	}

	const bootstrapChange = findChange(response, "bootstrap_config");
	if (bootstrapChange?.data) {
		const taxInclusive = bootstrapChange.data.tax_inclusive;
		if (taxInclusive !== null && typeof taxInclusive !== "undefined") {
			setTaxInclusiveSetting(Boolean(taxInclusive));
		}
		refreshSnapshotFromSync({
			posProfile: {
				...args.posProfile,
				name: bootstrapChange.data.profile_name || args.posProfile.name,
				modified:
					bootstrapChange.data.profile_modified || args.posProfile.modified,
			},
			cacheState: {
				taxInclusive:
					taxInclusive === null || typeof taxInclusive === "undefined"
						? null
						: Boolean(taxInclusive),
			},
		});
	}

	return finalizeState("bootstrap_config", "fresh", args, response);
}

export async function syncPriceListMetaResource(
	args: BootCriticalSyncArgs,
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
				priceListMetaReady: false,
			},
		});
		return finalizeState("price_list_meta", "limited", args, response);
	}

	const priceListChange = findChange(response, "price_list_meta");
	if (priceListChange?.data) {
		savePriceListMetaCache(args.posProfile.name, priceListChange.data);
		refreshSnapshotFromSync({
			posProfile: args.posProfile,
			cacheState: {
				priceListMetaReady: true,
			},
		});
	}

	return finalizeState("price_list_meta", "fresh", args, response);
}
