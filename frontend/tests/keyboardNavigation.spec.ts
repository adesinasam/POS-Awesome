// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
	collectKeyboardTargets,
	focusFirstKeyboardTarget,
	isEditableElement,
	moveFocusByArrow,
	resolveKeyboardNavigationRoot,
} from "../src/posapp/utils/keyboardNavigation";

const setRect = (element: HTMLElement, rect: Partial<DOMRect>) => {
	vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
		x: rect.left || 0,
		y: rect.top || 0,
		left: rect.left || 0,
		top: rect.top || 0,
		right: rect.right ?? (rect.left || 0) + (rect.width || 40),
		bottom: rect.bottom ?? (rect.top || 0) + (rect.height || 30),
		width: rect.width || 40,
		height: rect.height || 30,
		toJSON: () => ({}),
	} as DOMRect);
};

const keydown = (key: string) =>
	new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
	});

describe("keyboardNavigation", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	it("moves focus to the nearest visible target in the arrow direction", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);

		const current = document.createElement("button");
		const right = document.createElement("button");
		const lower = document.createElement("button");
		root.append(current, right, lower);
		setRect(root, { left: 0, top: 0, width: 400, height: 300 });
		setRect(current, { left: 20, top: 20 });
		setRect(right, { left: 120, top: 25 });
		setRect(lower, { left: 35, top: 110 });

		current.focus();

		expect(moveFocusByArrow(keydown("ArrowRight"), { root })).toBe(true);
		expect(document.activeElement).toBe(right);

		expect(moveFocusByArrow(keydown("ArrowDown"), { root })).toBe(true);
		expect(document.activeElement).toBe(lower);
	});

	it("skips disabled and hidden targets", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);

		const current = document.createElement("button");
		const disabled = document.createElement("button");
		const hidden = document.createElement("button");
		const available = document.createElement("button");
		disabled.disabled = true;
		hidden.style.display = "none";
		root.append(current, disabled, hidden, available);
		setRect(root, { left: 0, top: 0, width: 400, height: 300 });
		setRect(current, { left: 20, top: 20 });
		setRect(disabled, { left: 80, top: 20 });
		setRect(hidden, { left: 130, top: 20 });
		setRect(available, { left: 180, top: 20 });

		expect(collectKeyboardTargets(root)).toEqual([current, available]);
	});

	it("preserves native arrow behavior while editing an input", () => {
		const root = document.createElement("div");
		const input = document.createElement("input");
		const next = document.createElement("button");
		root.append(input, next);
		document.body.appendChild(root);
		setRect(root, { left: 0, top: 0, width: 400, height: 300 });
		setRect(input, { left: 20, top: 20 });
		setRect(next, { left: 120, top: 20 });

		input.focus();

		const event = keydown("ArrowRight");
		expect(isEditableElement(input)).toBe(true);
		expect(moveFocusByArrow(event, { root })).toBe(false);
		expect(event.defaultPrevented).toBe(false);
		expect(document.activeElement).toBe(input);
	});

	it("moves out of explicit POS keyboard inputs with arrow keys", () => {
		const root = document.createElement("div");
		const fieldWrapper = document.createElement("div");
		const input = document.createElement("input");
		const next = document.createElement("button");
		fieldWrapper.dataset.posKeyboardTarget = "item-search";
		fieldWrapper.appendChild(input);
		root.append(fieldWrapper, next);
		document.body.appendChild(root);
		setRect(root, { left: 0, top: 0, width: 400, height: 300 });
		setRect(input, { left: 20, top: 20 });
		setRect(next, { left: 120, top: 20 });

		input.focus();

		const event = keydown("ArrowRight");
		expect(moveFocusByArrow(event, { root })).toBe(true);
		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(next);
	});

	it("focuses a preferred target first when available", () => {
		const root = document.createElement("div");
		const fallback = document.createElement("button");
		const preferred = document.createElement("button");
		preferred.dataset.posKeyboardTarget = "payment-amount";
		root.append(fallback, preferred);
		document.body.appendChild(root);
		setRect(root, { left: 0, top: 0, width: 400, height: 300 });
		setRect(fallback, { left: 20, top: 20 });
		setRect(preferred, { left: 120, top: 20 });

		expect(focusFirstKeyboardTarget(root, "[data-pos-keyboard-target='payment-amount']")).toBe(true);
		expect(document.activeElement).toBe(preferred);
	});

	it("prefers a visible overlay keyboard root over the POS root", () => {
		const posRoot = document.createElement("div");
		const overlay = document.createElement("div");
		const overlayContent = document.createElement("div");
		const paymentRoot = document.createElement("div");
		overlayContent.className = "v-overlay__content";
		paymentRoot.dataset.posKeyboardRoot = "payment";
		overlayContent.appendChild(paymentRoot);
		overlay.appendChild(overlayContent);
		document.body.append(posRoot, overlay);
		setRect(posRoot, { left: 0, top: 0, width: 400, height: 300 });
		setRect(paymentRoot, { left: 0, top: 0, width: 400, height: 300 });

		expect(resolveKeyboardNavigationRoot(posRoot)).toBe(paymentRoot);
	});
});
