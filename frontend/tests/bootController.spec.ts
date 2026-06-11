// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
	BOOT_CACHE_RECOVERY_KEY,
	BOOT_RETRY_KEY,
	decideBootRecovery,
	type BootFailure,
} from "../src/bootstrap/bootController";

const failure = (
	code: BootFailure["code"],
	message = "boot failed",
): BootFailure => ({
	code,
	message,
	phase: "LOAD_ASSETS",
	error: new Error(message),
});

describe("POS boot controller recovery decisions", () => {
	beforeEach(() => {
		window.sessionStorage.clear();
	});

	it("emits one retry decision for a stale version mismatch before terminal failure", () => {
		const first = decideBootRecovery(failure("VERSION_MISMATCH"));
		const second = decideBootRecovery(failure("VERSION_MISMATCH"));

		expect(first.action).toBe("RETRY");
		expect(window.sessionStorage.getItem(BOOT_RETRY_KEY)).toBe("1");
		expect(second.action).toBe("FAIL");
		expect(second.failure.code).toBe("VERSION_MISMATCH");
	});

	it("emits one retry, one cache recovery, then terminal failure for chunk-load failures", () => {
		const first = decideBootRecovery(
			failure("CHUNK_LOAD_FAILED", "Loading chunk 12 failed."),
		);
		const second = decideBootRecovery(
			failure("CHUNK_LOAD_FAILED", "Loading chunk 12 failed."),
		);
		const third = decideBootRecovery(
			failure("CHUNK_LOAD_FAILED", "Loading chunk 12 failed."),
		);

		expect(first.action).toBe("RETRY");
		expect(second.action).toBe("CACHE_RECOVERY");
		expect(window.sessionStorage.getItem(BOOT_CACHE_RECOVERY_KEY)).toBe(
			"1",
		);
		expect(third.action).toBe("FAIL");
		expect(third.failure.code).toBe("CHUNK_LOAD_FAILED");
	});
});
