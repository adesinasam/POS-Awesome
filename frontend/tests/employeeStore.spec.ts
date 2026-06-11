import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useEmployeeStore } from "../src/posapp/stores/employeeStore";

describe("employeeStore", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		(globalThis as any).frappe = {
			session: {
				user: "cashier@example.com",
				user_fullname: "Main Cashier",
			},
		};
	});

	it("defaults current cashier from session and supports cashier switching", () => {
		const store = useEmployeeStore();

		store.setTerminalEmployees([
			{
				user: "cashier@example.com",
				full_name: "Main Cashier",
			},
			{
				user: "backup@example.com",
				full_name: "Backup Cashier",
			},
		]);

		expect(store.currentCashier?.user).toBe("cashier@example.com");
		expect(store.currentCashierDisplay).toBe("Main Cashier");

		store.setCurrentCashier("backup@example.com");

		expect(store.currentCashier?.user).toBe("backup@example.com");
		expect(store.currentCashierDisplay).toBe("Backup Cashier");
	});

	it("opens switch flow and locks or unlocks the terminal", () => {
		const store = useEmployeeStore();

		store.openEmployeeSwitch();
		expect(store.switchDialogOpen).toBe(true);

		store.lockTerminal();
		expect(store.switchDialogOpen).toBe(false);
		expect(store.lockDialogOpen).toBe(true);
		expect(store.isLocked).toBe(true);

		store.unlockTerminal();
		expect(store.lockDialogOpen).toBe(false);
		expect(store.isLocked).toBe(false);
	});

	it("upgrades the session cashier with supervisor metadata from terminal employees", () => {
		const store = useEmployeeStore();

		expect(store.currentCashier?.user).toBe("cashier@example.com");
		expect(store.currentCashier?.is_supervisor).toBeUndefined();

		store.setTerminalEmployees([
			{
				user: "cashier@example.com",
				full_name: "Main Cashier",
				is_supervisor: true,
			},
		]);

		expect(store.currentCashier?.user).toBe("cashier@example.com");
		expect(store.currentCashier?.is_supervisor).toBe(true);
	});
});
