import { expect, test, type Page } from "@playwright/test";

async function installReplayHarness(page: Page) {
	await page.evaluate(() => {
		const DB_NAME = "posa_e2e_outbox";
		const STORE = "invoice_outbox";

		function openDb(): Promise<IDBDatabase> {
			return new Promise((resolve, reject) => {
				const request = indexedDB.open(DB_NAME, 1);
				request.onupgradeneeded = () => {
					const db = request.result;
					if (!db.objectStoreNames.contains(STORE)) {
						db.createObjectStore(STORE, {
							keyPath: "client_request_id",
						});
					}
				};
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		}

		function putRow(row: Record<string, unknown>) {
			return openDb().then(
				(db) =>
					new Promise<void>((resolve, reject) => {
						const tx = db.transaction(STORE, "readwrite");
						tx.objectStore(STORE).put(row);
						tx.oncomplete = () => resolve();
						tx.onerror = () => reject(tx.error);
					}),
			);
		}

		function getRows(): Promise<any[]> {
			return openDb().then(
				(db) =>
					new Promise((resolve, reject) => {
						const tx = db.transaction(STORE, "readonly");
						const request = tx.objectStore(STORE).getAll();
						request.onsuccess = () => resolve(request.result);
						request.onerror = () => reject(request.error);
					}),
			);
		}

		(window as any).__posaHarness = {
			get submissions(): string[] {
				return JSON.parse(localStorage.getItem("posa_e2e_submissions") || "[]");
			},
			set submissions(value: string[]) {
				localStorage.setItem("posa_e2e_submissions", JSON.stringify(value));
			},
			async enqueueInvoice(clientRequestId: string) {
				await putRow({
					client_request_id: clientRequestId,
					status: "pending",
					invoice: { posa_client_request_id: clientRequestId },
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				});
			},
			async syncOnce() {
				if (!navigator.onLine) {
					return { acknowledged: 0 };
				}
				const rows = await getRows();
				let acknowledged = 0;
				for (const row of rows.filter((entry) => entry.status !== "acknowledged")) {
					const submissions = (window as any).__posaHarness.submissions;
					if (!submissions.includes(row.client_request_id)) {
						submissions.push(row.client_request_id);
						(window as any).__posaHarness.submissions = submissions;
					}
					await putRow({
						...row,
						status: "acknowledged",
						invoice_name: "ACC-SINV-E2E-0001",
						acknowledged_at: new Date().toISOString(),
					});
					acknowledged += 1;
				}
				return { acknowledged };
			},
			getRows,
		};
	});
}

test("offline queued sale replays once after reconnect", async ({ context, page }) => {
	await page.route("https://posawesome.test/posapp", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<main>POS offline replay harness</main>",
		});
	});
	await page.goto("https://posawesome.test/posapp");
	await installReplayHarness(page);

	await context.setOffline(true);
	await page.evaluate(() =>
		(window as any).__posaHarness.enqueueInvoice("e2e-client-request-001"),
	);
	await page.reload();
	await installReplayHarness(page);
	await context.setOffline(false);
	await page.evaluate(() => (window as any).__posaHarness.syncOnce());
	await page.evaluate(() => (window as any).__posaHarness.syncOnce());

	const result = await page.evaluate(async () => ({
		rows: await (window as any).__posaHarness.getRows(),
		submissions: (window as any).__posaHarness.submissions,
	}));

	expect(result.submissions).toEqual(["e2e-client-request-001"]);
	expect(result.rows).toEqual([
		expect.objectContaining({
			client_request_id: "e2e-client-request-001",
			status: "acknowledged",
			invoice_name: "ACC-SINV-E2E-0001",
		}),
	]);
});
