const POS_ALIAS_BASE_PATH = "/app/pos";
const POS_CANONICAL_BASE_PATH = "/app/posapp";

function buildCanonicalPosAppUrl() {
	const pathname = typeof window !== "undefined" && window.location ? window.location.pathname || "" : "";
	const search = typeof window !== "undefined" && window.location ? window.location.search || "" : "";
	const hash = typeof window !== "undefined" && window.location ? window.location.hash || "" : "";

	let suffix = "";
	if (pathname && pathname.toLowerCase().startsWith(`${POS_ALIAS_BASE_PATH.toLowerCase()}/`)) {
		suffix = pathname.slice(POS_ALIAS_BASE_PATH.length);
	}

	return `${POS_CANONICAL_BASE_PATH}${suffix}${search}${hash}`;
}

function redirectToCanonicalPosApp() {
	if (typeof window === "undefined" || !window.location) {
		return;
	}

	const targetUrl = buildCanonicalPosAppUrl();
	const currentUrl = `${window.location.pathname || ""}${window.location.search || ""}${window.location.hash || ""}`;
	if (targetUrl !== currentUrl) {
		window.location.replace(targetUrl);
	}
}

frappe.pages["pos"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: "POS Awesome",
		single_column: true,
	});

	redirectToCanonicalPosApp();
};

frappe.pages["pos"].on_page_show = function () {
	redirectToCanonicalPosApp();
};
