export const KEYBOARD_TARGET_SELECTOR = [
	"[data-pos-keyboard-target]",
	"button",
	"a[href]",
	"input:not([type='hidden'])",
	"select",
	"textarea",
	"[contenteditable='true']",
	"[tabindex]:not([tabindex='-1'])",
	"[role='button']",
].join(",");

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

const isHTMLElement = (value: unknown): value is HTMLElement =>
	value instanceof HTMLElement;

const isDirectlyFocusable = (element: HTMLElement) =>
	element.matches(
		"button, a[href], input:not([type='hidden']), select, textarea, [contenteditable='true']",
	) || element.tabIndex >= 0;

export const isEditableElement = (element: Element | null | undefined) => {
	if (!element || !isHTMLElement(element)) {
		return false;
	}

	const target = element.closest(
		"input, textarea, select, [contenteditable='true'], .dp__input",
	);
	if (!target || !(target instanceof HTMLElement)) {
		return false;
	}

	if (target.matches("input[type='checkbox'], input[type='radio'], input[type='button'], input[type='submit']")) {
		return false;
	}

	return true;
};

const shouldUseEditableArrowNavigation = (element: Element | null | undefined) => {
	if (!element || !isHTMLElement(element)) {
		return false;
	}

	const keyboardTarget = element.closest("[data-pos-keyboard-target]");
	return Boolean(
		keyboardTarget &&
			!keyboardTarget.hasAttribute("data-pos-keyboard-native-arrows"),
	);
};

const hasDisabledState = (element: HTMLElement) =>
	element.hasAttribute("disabled") ||
	element.getAttribute("aria-disabled") === "true" ||
	element.classList.contains("v-btn--disabled") ||
	element.closest("[aria-disabled='true'], [disabled]");

export const isElementVisible = (element: HTMLElement) => {
	if (!element.isConnected) {
		return false;
	}

	const style = window.getComputedStyle(element);
	if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
		return false;
	}

	const rect = element.getBoundingClientRect();
	if (rect.width > 0 && rect.height > 0) {
		return true;
	}

	return Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
};

const normalizeTarget = (element: Element) => {
	if (!(element instanceof HTMLElement)) {
		return null;
	}

	const nestedFocusable = element.matches(KEYBOARD_TARGET_SELECTOR) && isDirectlyFocusable(element)
		? element
		: element.querySelector<HTMLElement>(
				"button, a[href], input:not([type='hidden']), select, textarea, [contenteditable='true'], [tabindex]:not([tabindex='-1'])",
			);

	return nestedFocusable instanceof HTMLElement ? nestedFocusable : null;
};

export const collectKeyboardTargets = (root: ParentNode | null | undefined) => {
	if (!root) {
		return [];
	}

	const seen = new Set<HTMLElement>();
	const nodes = Array.from(root.querySelectorAll(KEYBOARD_TARGET_SELECTOR));
	const targets: HTMLElement[] = [];

	for (const node of nodes) {
		const target = normalizeTarget(node);
		if (!target || seen.has(target) || hasDisabledState(target) || !isElementVisible(target)) {
			continue;
		}

		seen.add(target);
		targets.push(target);
	}

	return targets;
};

const getCenter = (element: HTMLElement) => {
	const rect = element.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2,
		rect,
	};
};

const scoreCandidate = (
	key: string,
	current: ReturnType<typeof getCenter>,
	candidate: ReturnType<typeof getCenter>,
) => {
	const dx = candidate.x - current.x;
	const dy = candidate.y - current.y;

	if (key === "ArrowRight" && dx <= 1) return null;
	if (key === "ArrowLeft" && dx >= -1) return null;
	if (key === "ArrowDown" && dy <= 1) return null;
	if (key === "ArrowUp" && dy >= -1) return null;

	const primary = key === "ArrowRight" || key === "ArrowLeft" ? Math.abs(dx) : Math.abs(dy);
	const secondary = key === "ArrowRight" || key === "ArrowLeft" ? Math.abs(dy) : Math.abs(dx);

	return secondary * 1000 + primary;
};

const sortTargetsByPosition = (targets: HTMLElement[]) =>
	[...targets].sort((a, b) => {
		const aRect = a.getBoundingClientRect();
		const bRect = b.getBoundingClientRect();
		return aRect.top - bRect.top || aRect.left - bRect.left;
	});

export const focusFirstKeyboardTarget = (
	root: ParentNode | null | undefined,
	preferredSelector?: string,
) => {
	if (!root) {
		return false;
	}

	const preferred = preferredSelector
		? Array.from(root.querySelectorAll(preferredSelector))
				.map(normalizeTarget)
				.find((target): target is HTMLElement => Boolean(target && !hasDisabledState(target) && isElementVisible(target)))
		: null;
	const target = preferred || sortTargetsByPosition(collectKeyboardTargets(root))[0];
	if (!target) {
		return false;
	}

	target.scrollIntoView?.({ block: "nearest", inline: "nearest" });
	target.focus();
	return true;
};

export const resolveKeyboardNavigationRoot = (
	defaultRoot: HTMLElement | null | undefined,
	activeElement: Element | null = document.activeElement,
) => {
	const visibleOverlays = Array.from(
		document.querySelectorAll<HTMLElement>(".v-overlay__content"),
	).filter(isElementVisible);
	const overlayRoots = Array.from(
		document.querySelectorAll<HTMLElement>(".v-overlay__content [data-pos-keyboard-root]"),
	).filter(isElementVisible);

	if (overlayRoots.length) {
		return overlayRoots[overlayRoots.length - 1];
	}

	if (visibleOverlays.length) {
		return null;
	}

	if (!defaultRoot || !isElementVisible(defaultRoot)) {
		return null;
	}

	if (!activeElement || activeElement === document.body || defaultRoot.contains(activeElement)) {
		return defaultRoot;
	}

	return null;
};

export const moveFocusByArrow = (
	event: KeyboardEvent,
	options: { root: HTMLElement | null | undefined },
) => {
	if (
		event.defaultPrevented ||
		event.altKey ||
		event.ctrlKey ||
		event.metaKey ||
		!ARROW_KEYS.has(event.key)
	) {
		return false;
	}

	const root = options.root;
	if (!root) {
		return false;
	}

	const activeElement = document.activeElement;
	if (isEditableElement(activeElement) && !shouldUseEditableArrowNavigation(activeElement)) {
		return false;
	}

	const targets = collectKeyboardTargets(root);
	if (!targets.length) {
		return false;
	}

	const activeTarget =
		activeElement instanceof HTMLElement
			? targets.find((target) => target === activeElement || target.contains(activeElement))
			: null;

	if (!activeTarget) {
		event.preventDefault();
		sortTargetsByPosition(targets)[0]?.focus();
		return true;
	}

	const current = getCenter(activeTarget);
	let bestTarget: HTMLElement | null = null;
	let bestScore = Number.POSITIVE_INFINITY;

	for (const target of targets) {
		if (target === activeTarget) {
			continue;
		}
		const score = scoreCandidate(event.key, current, getCenter(target));
		if (score !== null && score < bestScore) {
			bestScore = score;
			bestTarget = target;
		}
	}

	if (!bestTarget) {
		return false;
	}

	event.preventDefault();
	bestTarget.scrollIntoView?.({ block: "nearest", inline: "nearest" });
	bestTarget.focus();
	return true;
};
