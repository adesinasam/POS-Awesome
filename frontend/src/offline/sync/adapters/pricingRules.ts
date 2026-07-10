import {
	pricingRuleRepository,
	type OfflinePricingRuleRecord,
} from "../../repositories";
import { savePricingRulesSnapshot } from "../../cache";
import {
	buildResourceSyncResult,
	persistResourceSyncState,
	refreshSnapshotFromSync,
	type ResourceSyncResult,
	type SyncResponse,
	type SyncScopedProfile,
} from "./common";

type PricingRulesFetcher = (_args: {
	posProfile: SyncScopedProfile;
	watermark?: string | null;
	offset?: number;
	schemaVersion?: string | null;
}) => Promise<SyncResponse>;

type PricingRulesSyncArgs = {
	posProfile: SyncScopedProfile;
	watermark?: string | null;
	schemaVersion?: string | null;
	fetcher: PricingRulesFetcher;
};

type PricingRulesSyncProfile = SyncScopedProfile & {
	currency?: string | null;
	selling_price_list?: string | null;
};

function deletedRuleNames(response: SyncResponse) {
	return (response?.deleted || [])
		.map((entry) => String(entry?.key || ""))
		.filter((key) => key.startsWith("pricing_rule::"))
		.map((key) => key.slice("pricing_rule::".length).split("::")[0])
		.filter((name): name is string => !!name);
}

function buildSnapshotContext(posProfile: PricingRulesSyncProfile) {
	return JSON.stringify({
		company: posProfile?.company || "",
		price_list: posProfile?.selling_price_list || "",
		currency: posProfile?.currency || "",
		customer: "",
		customer_group: "",
		territory: "",
		date: new Date().toISOString().slice(0, 10),
	});
}

async function refreshPricingSnapshotFromRepository(
	posProfile: PricingRulesSyncProfile,
) {
	const hasContext = Boolean(
		posProfile?.company && posProfile?.selling_price_list && posProfile?.currency,
	);
	if (!hasContext) {
		refreshSnapshotFromSync({
			posProfile,
			cacheState: {
				pricingSnapshotCount: 0,
				pricingContext: null,
			},
		});
		return;
	}

	const snapshot = await pricingRuleRepository.getAll();
	(
		savePricingRulesSnapshot as unknown as (
			_snapshot: OfflinePricingRuleRecord[],
			_context: string,
		) => void
	)(snapshot, buildSnapshotContext(posProfile));
}

export async function syncPricingRulesResource(
	args: PricingRulesSyncArgs,
): Promise<ResourceSyncResult> {
	if (!args.watermark) {
		await pricingRuleRepository.clear();
	}

	let offset = 0;
	let finalResponse: SyncResponse = {};
	while (true) {
		const response = await args.fetcher({
			posProfile: args.posProfile,
			watermark: args.watermark || null,
			offset,
			schemaVersion: args.schemaVersion,
		});
		finalResponse = response;

		if (response?.full_resync_required) {
			await pricingRuleRepository.clear();
			refreshSnapshotFromSync({
				posProfile: args.posProfile,
				cacheState: {
					pricingSnapshotCount: 0,
					pricingContext: null,
				},
			});
			await persistResourceSyncState({
				resourceId: "pricing_rules",
				status: "limited",
				posProfile: args.posProfile,
				response,
				watermark: args.watermark,
			});
			return buildResourceSyncResult(
				"pricing_rules",
				"limited",
				response,
				args.watermark,
			);
		}

		const rows = (response?.changes || [])
			.map((entry) => entry?.data)
			.filter(
				(row): row is OfflinePricingRuleRecord =>
					!!row?.key && !!row?.rule_name,
			);
		await pricingRuleRepository.replaceRuleTargets(rows);
		await pricingRuleRepository.deleteByRuleNames(
			deletedRuleNames(response),
		);

		if (!response?.has_more) {
			break;
		}
		const nextOffset = Number(response?.next_offset);
		if (!Number.isFinite(nextOffset) || nextOffset <= offset) {
			throw new Error("Pricing Rule sync returned an invalid next_offset");
		}
		offset = nextOffset;
	}

	await persistResourceSyncState({
		resourceId: "pricing_rules",
		status: "fresh",
		posProfile: args.posProfile,
		response: finalResponse,
		watermark: args.watermark,
	});
	await refreshPricingSnapshotFromRepository(args.posProfile);
	return buildResourceSyncResult(
		"pricing_rules",
		"fresh",
		finalResponse,
		args.watermark,
	);
}
