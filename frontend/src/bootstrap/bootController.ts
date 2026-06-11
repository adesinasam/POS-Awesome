export const BOOT_RETRY_KEY = "posa_boot_retry_once";
export const BOOT_CACHE_RECOVERY_KEY = "posa_boot_cache_recovery_once";

export const BOOT_PHASES = [
	"LOAD_VERSION",
	"LOAD_ASSETS",
	"MOUNT_SHELL",
	"INIT_STORAGE",
	"RUN_BOOT_SYNC",
	"READY",
] as const;

export type BootPhase = (typeof BOOT_PHASES)[number];

export type BootFailureCode =
	| "VERSION_MISMATCH"
	| "LOAD_ASSETS_FAILED"
	| "CHUNK_LOAD_FAILED"
	| "MOUNT_FAILED"
	| "INIT_STORAGE_FAILED"
	| "BOOT_SYNC_FAILED"
	| "UNKNOWN";

export type BootFailure = {
	code: BootFailureCode;
	phase: BootPhase;
	message: string;
	error?: unknown;
};

export type BootRecoveryDecision =
	| { action: "RETRY"; failure: BootFailure; param: "_posa_boot_retry" }
	| {
			action: "CACHE_RECOVERY";
			failure: BootFailure;
			param: "_posa_asset_recovery";
	  }
	| { action: "FAIL"; failure: BootFailure };

export type BuildMetadata = {
	version?: string;
	buildVersion?: string;
	assets?: Record<string, string>;
};

export type BootAssetResult =
	| { ok: true; module?: any; version?: string | null }
	| { ok: false; failure: BootFailure };

export type BootControllerOptions = {
	pageRef?: any;
	loadVersion: () => Promise<BuildMetadata | null>;
	loadAssets: (metadata: BuildMetadata | null) => Promise<BootAssetResult>;
	mountShell: (context: {
		pageRef?: any;
		metadata: BuildMetadata | null;
		assets: Extract<BootAssetResult, { ok: true }>;
	}) => Promise<any>;
	initStorage?: (context: BootContext) => Promise<void>;
	runBootSync?: (context: BootContext) => Promise<void>;
	performAssetRecovery?: () => Promise<void>;
	redirect?: (param: string) => void;
	onPhase?: (phase: BootPhase, context: Partial<BootContext>) => void;
	onFailure?: (failure: BootFailure, decision: BootRecoveryDecision) => void;
};

export type BootContext = {
	pageRef?: any;
	metadata: BuildMetadata | null;
	assets: Extract<BootAssetResult, { ok: true }>;
	appInstance: any;
	phase: BootPhase;
};

function readSessionFlag(key: string): boolean {
	try {
		return window.sessionStorage?.getItem(key) === "1";
	} catch {
		return false;
	}
}

function writeSessionFlag(key: string) {
	try {
		window.sessionStorage?.setItem(key, "1");
	} catch {
		// Storage can be unavailable in private or restricted contexts.
	}
}

export function clearBootRecoveryState() {
	try {
		window.sessionStorage?.removeItem(BOOT_RETRY_KEY);
		window.sessionStorage?.removeItem(BOOT_CACHE_RECOVERY_KEY);
	} catch {
		// Best-effort cleanup only.
	}
}

export function isBootAssetRecoveryFailure(failure: BootFailure): boolean {
	return (
		failure.code === "CHUNK_LOAD_FAILED" ||
		failure.code === "LOAD_ASSETS_FAILED" ||
		failure.code === "MOUNT_FAILED"
	);
}

export function decideBootRecovery(failure: BootFailure): BootRecoveryDecision {
	if (!readSessionFlag(BOOT_RETRY_KEY)) {
		writeSessionFlag(BOOT_RETRY_KEY);
		return { action: "RETRY", failure, param: "_posa_boot_retry" };
	}

	if (
		isBootAssetRecoveryFailure(failure) &&
		!readSessionFlag(BOOT_CACHE_RECOVERY_KEY)
	) {
		writeSessionFlag(BOOT_CACHE_RECOVERY_KEY);
		return {
			action: "CACHE_RECOVERY",
			failure,
			param: "_posa_asset_recovery",
		};
	}

	return { action: "FAIL", failure };
}

function toBootFailure(
	error: unknown,
	phase: BootPhase,
	fallbackCode: BootFailureCode,
): BootFailure {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		"phase" in error &&
		"message" in error
	) {
		return error as BootFailure;
	}

	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: String(error || "POS boot failed");
	return {
		code: fallbackCode,
		phase,
		message,
		error,
	};
}

function showTerminalFailure(failure: BootFailure) {
	if (
		typeof frappe !== "undefined" &&
		typeof frappe.msgprint === "function"
	) {
		frappe.msgprint({
			title: "POS Awesome",
			indicator: "red",
			message: `POS app failed to start (${failure.code}). Automatic cache recovery was attempted. If the problem persists, reload /app/posapp or use the in-app cache clear shortcut.`,
		});
		return;
	}

	console.error("POS app failed to start", failure);
}

async function handleFailure(
	failure: BootFailure,
	options: BootControllerOptions,
) {
	const decision = decideBootRecovery(failure);
	options.onFailure?.(failure, decision);

	console.error("POS App bootstrap failed", {
		phase: failure.phase,
		code: failure.code,
		message: failure.message,
		error: failure.error,
	});

	if (decision.action === "RETRY") {
		options.redirect?.(decision.param);
		return decision;
	}

	if (decision.action === "CACHE_RECOVERY") {
		await options.performAssetRecovery?.();
		options.redirect?.(decision.param);
		return decision;
	}

	clearBootRecoveryState();
	showTerminalFailure(failure);
	return decision;
}

function markPhase(
	phase: BootPhase,
	options: BootControllerOptions,
	context: Partial<BootContext>,
) {
	options.onPhase?.(phase, { ...context, phase });
}

export async function startPosBoot(options: BootControllerOptions) {
	let phase: BootPhase = "LOAD_VERSION";
	let metadata: BuildMetadata | null = null;
	let assets: Extract<BootAssetResult, { ok: true }> | null = null;
	let appInstance: any = null;

	try {
		markPhase("LOAD_VERSION", options, {});
		metadata = await options.loadVersion();

		phase = "LOAD_ASSETS";
		markPhase("LOAD_ASSETS", options, { metadata });
		const assetResult = await options.loadAssets(metadata);
		if (!assetResult.ok) {
			throw assetResult.failure;
		}
		assets = assetResult;

		phase = "MOUNT_SHELL";
		markPhase("MOUNT_SHELL", options, { metadata, assets });
		appInstance = await options.mountShell({
			pageRef: options.pageRef,
			metadata,
			assets,
		});

		const context: BootContext = {
			pageRef: options.pageRef,
			metadata,
			assets,
			appInstance,
			phase,
		};

		phase = "INIT_STORAGE";
		markPhase("INIT_STORAGE", options, context);
		await options.initStorage?.({ ...context, phase });

		phase = "RUN_BOOT_SYNC";
		markPhase("RUN_BOOT_SYNC", options, context);
		await options.runBootSync?.({ ...context, phase });

		phase = "READY";
		markPhase("READY", options, context);
		clearBootRecoveryState();
		return { ok: true as const, context: { ...context, phase } };
	} catch (error) {
		const fallbackCode: BootFailureCode =
			phase === "MOUNT_SHELL"
				? "MOUNT_FAILED"
				: phase === "INIT_STORAGE"
					? "INIT_STORAGE_FAILED"
					: phase === "RUN_BOOT_SYNC"
						? "BOOT_SYNC_FAILED"
						: "UNKNOWN";
		const failure = toBootFailure(error, phase, fallbackCode);
		const decision = await handleFailure(failure, options);
		return { ok: false as const, failure, decision };
	}
}
