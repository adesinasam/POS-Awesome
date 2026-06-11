// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	BOOT_PHASES,
	startPosBoot,
	type BootPhase,
} from "../src/bootstrap/bootController";

describe("POS boot controller workflow", () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		vi.restoreAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("emits deterministic phase transitions and clears retry state once ready", async () => {
		const phases: BootPhase[] = [];
		window.sessionStorage.setItem("posa_boot_retry_once", "1");
		window.sessionStorage.setItem("posa_boot_cache_recovery_once", "1");

		const result = await startPosBoot({
			loadVersion: vi.fn(async () => ({ version: "build-2" })),
			loadAssets: vi.fn(async () => ({
				ok: true,
				module: {},
				version: "build-2",
			})),
			mountShell: vi.fn(async () => ({ mounted: true })),
			initStorage: vi.fn(async () => undefined),
			runBootSync: vi.fn(async () => undefined),
			onPhase: (phase) => phases.push(phase),
		});

		expect(result.ok).toBe(true);
		expect(phases).toEqual(BOOT_PHASES);
		expect(window.sessionStorage.getItem("posa_boot_retry_once")).toBeNull();
		expect(
			window.sessionStorage.getItem("posa_boot_cache_recovery_once"),
		).toBeNull();
	});

	it("attributes boot-sync failures to RUN_BOOT_SYNC and does not emit READY", async () => {
		const phases: BootPhase[] = [];
		const redirect = vi.fn();
		const onFailure = vi.fn();

		const result = await startPosBoot({
			loadVersion: vi.fn(async () => ({ version: "build-2" })),
			loadAssets: vi.fn(async () => ({
				ok: true,
				module: {},
				version: "build-2",
			})),
			mountShell: vi.fn(async () => ({ mounted: true })),
			initStorage: vi.fn(async () => undefined),
			runBootSync: vi.fn(async () => {
				throw new Error("warm sync failed");
			}),
			redirect,
			onFailure,
			onPhase: (phase) => phases.push(phase),
		});

		expect(result.ok).toBe(false);
		expect(result.failure).toEqual(
			expect.objectContaining({
				code: "BOOT_SYNC_FAILED",
				phase: "RUN_BOOT_SYNC",
				message: "warm sync failed",
			}),
		);
		expect(phases).toEqual(BOOT_PHASES.filter((phase) => phase !== "READY"));
		expect(redirect).toHaveBeenCalledWith("_posa_boot_retry");
		expect(onFailure).toHaveBeenCalledWith(
			expect.objectContaining({ phase: "RUN_BOOT_SYNC" }),
			expect.objectContaining({ action: "RETRY" }),
		);
	});

	it("runs stale asset cache recovery once before terminal failure", async () => {
		const performAssetRecovery = vi.fn(async () => undefined);
		const redirect = vi.fn();
		const terminalMessage = vi.fn();
		(globalThis as any).frappe = { msgprint: terminalMessage };
		window.sessionStorage.setItem("posa_boot_retry_once", "1");

		const options = {
			loadVersion: vi.fn(async () => ({ version: "build-3" })),
			loadAssets: vi.fn(async () => ({
				ok: false as const,
				failure: {
					code: "CHUNK_LOAD_FAILED" as const,
					phase: "LOAD_ASSETS" as const,
					message: "Loading chunk 12 failed.",
				},
			})),
			mountShell: vi.fn(async () => ({ mounted: true })),
			performAssetRecovery,
			redirect,
		};

		const first = await startPosBoot(options);
		const second = await startPosBoot(options);

		expect(first.decision.action).toBe("CACHE_RECOVERY");
		expect(second.decision.action).toBe("FAIL");
		expect(performAssetRecovery).toHaveBeenCalledTimes(1);
		expect(redirect).toHaveBeenCalledTimes(1);
		expect(terminalMessage).toHaveBeenCalledTimes(1);
		delete (globalThis as any).frappe;
	});
});
