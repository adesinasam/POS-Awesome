<template>
	<v-card class="gift-cards-view pos-themed-card">
		<div class="gift-cards-view__header">
			<div class="gift-cards-view__hero">
				<div class="gift-cards-view__hero-copy">
					<p class="gift-cards-view__eyebrow">{{ __("Gift Cards") }}</p>
					<h2 class="gift-cards-view__title">{{ __("Gift Card Management") }}</h2>
					<p class="gift-cards-view__subtitle">
						{{ __("Check balance for any card. Supervisors can issue and top up cards here.") }}
					</p>
				</div>
				<div class="gift-cards-view__hero-badges">
					<span class="gift-cards-view__badge gift-cards-view__badge--soft">
						{{ isSupervisor ? __("Supervisor Access") : __("Cashier Access") }}
					</span>
					<span class="gift-cards-view__badge">
						{{ posProfile?.company || __("No Company Selected") }}
					</span>
				</div>
			</div>
		</div>

		<div class="gift-cards-view__body">
			<div class="gift-cards-view__panel gift-cards-view__panel--hero">
				<div class="gift-cards-view__scan-tip">
					<div class="gift-cards-view__scan-copy">
						<p class="gift-cards-view__section-label">{{ __("Scan-Ready") }}</p>
						<h3>{{ __("Manual codes, barcode scans, and QR scans work in the same field") }}</h3>
						<p>
							{{
								__(
									"Use one workflow for balance checks, new issuance, and top ups without leaving POS.",
								)
							}}
						</p>
					</div>
					<div class="gift-cards-view__highlights">
						<div class="gift-cards-view__highlight">
							<span>{{ __("Workflow") }}</span>
							<strong>{{ currentModeTitle }}</strong>
						</div>
						<div class="gift-cards-view__highlight">
							<span>{{ __("Profile") }}</span>
							<strong>{{ posProfile?.name || __("Unavailable") }}</strong>
						</div>
					</div>
				</div>
			</div>

			<div v-if="isSupervisor" class="gift-cards-view__modes">
				<v-btn
					:variant="mode === 'issue' ? 'flat' : 'tonal'"
					:color="mode === 'issue' ? 'primary' : undefined"
					size="small"
					@click="mode = 'issue'"
				>
					{{ __("Issue New Card") }}
				</v-btn>
				<v-btn
					:variant="mode === 'top_up' ? 'flat' : 'tonal'"
					:color="mode === 'top_up' ? 'primary' : undefined"
					size="small"
					@click="mode = 'top_up'"
				>
					{{ __("Top Up Card") }}
				</v-btn>
				<v-btn
					:variant="mode === 'check' ? 'flat' : 'tonal'"
					:color="mode === 'check' ? 'primary' : undefined"
					size="small"
					@click="mode = 'check'"
				>
					{{ __("Check Balance") }}
				</v-btn>
			</div>

			<div class="gift-cards-view__panel">
				<div class="gift-cards-view__form-header">
					<div>
						<p class="gift-cards-view__section-label">{{ currentModeLabel }}</p>
						<h3 class="gift-cards-view__form-title">{{ currentModeTitle }}</h3>
					</div>
					<span class="gift-cards-view__mini-note">{{
						__("Scan or paste the card code below.")
					}}</span>
				</div>

				<v-text-field
					v-model="cardCode"
					:label="__('Gift Card Code')"
					variant="outlined"
					density="compact"
				/>

				<v-text-field
					v-if="mode !== 'check'"
					v-model="amount"
					:label="mode === 'issue' ? __('Initial Amount') : __('Top Up Amount')"
					variant="outlined"
					density="compact"
					type="number"
					min="0"
				/>

				<v-alert v-if="message" :type="messageType" variant="tonal" density="compact">
					{{ message }}
				</v-alert>
			</div>

			<div class="gift-cards-view__stats">
				<div class="gift-cards-view__stat">
					<span>{{ __("Status") }}</span>
					<strong>{{ status || __("Unknown") }}</strong>
					<small>{{ __("Card health after the last live lookup") }}</small>
				</div>
				<div class="gift-cards-view__stat">
					<span>{{ __("Balance") }}</span>
					<strong>{{ formatCurrency(balance) }}</strong>
					<small>{{ __("Current redeemable value on the gift card") }}</small>
				</div>
				<div class="gift-cards-view__stat">
					<span>{{ __("Access") }}</span>
					<strong>{{
						isSupervisor ? __("Issue, top up, and check") : __("Check balance only")
					}}</strong>
					<small>{{ __("Supervisor permissions unlock issuance and reloads") }}</small>
				</div>
			</div>

			<div class="gift-cards-view__actions">
				<v-btn variant="tonal" :loading="loading" @click="checkBalance">
					{{ __("Check Balance") }}
				</v-btn>
				<v-btn
					v-if="isSupervisor && mode === 'issue'"
					color="primary"
					variant="flat"
					:loading="loading"
					@click="issueCard"
				>
					{{ __("Issue New Card") }}
				</v-btn>
				<v-btn
					v-else-if="isSupervisor && mode === 'top_up'"
					color="primary"
					variant="flat"
					:loading="loading"
					@click="topUpCard"
				>
					{{ __("Top Up Card") }}
				</v-btn>
			</div>
		</div>
	</v-card>
</template>

<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { useEmployeeStore } from "../../../stores/employeeStore";
import { useUIStore } from "../../../stores/uiStore";

const __ = window.__;
const frappe = window.frappe;

const employeeStore = useEmployeeStore();
const uiStore = useUIStore();
const { currentCashier } = storeToRefs(employeeStore);
const { posProfile } = storeToRefs(uiStore);

const cardCode = ref("");
const amount = ref("");
const balance = ref(0);
const status = ref("");
const loading = ref(false);
const message = ref("");
const messageType = ref("info");
const mode = ref("check");

const isSupervisor = computed(() => Boolean(currentCashier.value?.is_supervisor));
const currentModeLabel = computed(() =>
	mode.value === "issue"
		? __("Issue Workflow")
		: mode.value === "top_up"
			? __("Reload Workflow")
			: __("Lookup Workflow"),
);
const currentModeTitle = computed(() =>
	mode.value === "issue"
		? __("Create and load a new prepaid card")
		: mode.value === "top_up"
			? __("Add more value to an existing gift card")
			: __("Check live balance before redemption"),
);

const flt = (value) => {
	if (typeof window !== "undefined" && typeof window.flt === "function") {
		return window.flt(value || 0, 2);
	}
	return Number(value || 0);
};

const formatCurrency = (value) => {
	const numeric = flt(value);
	const formatter = typeof window?.format_currency === "function" ? window.format_currency : null;
	return formatter
		? formatter(numeric, posProfile.value?.currency || "")
		: `${posProfile.value?.currency || ""} ${numeric}`.trim();
};

const setMessage = (text, type = "info") => {
	message.value = text || "";
	messageType.value = type;
};

const checkBalance = async () => {
	if (!cardCode.value || !posProfile.value?.company) {
		setMessage(__("Gift card code is required."), "warning");
		return;
	}

	loading.value = true;
	setMessage("");
	try {
		const response = await frappe.call({
			method: "posawesome.posawesome.api.gift_cards.check_gift_card_balance",
			args: {
				gift_card_code: cardCode.value,
				company: posProfile.value.company,
			},
		});
		const card = response?.message || {};
		balance.value = flt(card.current_balance || 0);
		status.value = card.status || "";
		setMessage(__("Gift card loaded successfully."), "success");
	} catch (error) {
		setMessage(error?.message || __("Unable to load gift card balance."), "error");
	} finally {
		loading.value = false;
	}
};

const issueCard = async () => {
	if (!isSupervisor.value) {
		setMessage(__("A POS supervisor is required for this action."), "warning");
		return;
	}

	loading.value = true;
	setMessage("");
	try {
		const response = await frappe.call({
			method: "posawesome.posawesome.api.gift_cards.issue_gift_card",
			args: {
				pos_profile: posProfile.value?.name,
				cashier: currentCashier.value?.user,
				company: posProfile.value?.company,
				initial_amount: flt(amount.value || 0),
				gift_card_code: cardCode.value || null,
				currency: posProfile.value?.currency,
			},
		});
		const card = response?.message || {};
		cardCode.value = card.gift_card_code || cardCode.value;
		balance.value = flt(card.current_balance || 0);
		status.value = card.status || "Active";
		mode.value = "check";
		setMessage(__("Gift card issued successfully."), "success");
	} catch (error) {
		setMessage(error?.message || __("Unable to issue gift card."), "error");
	} finally {
		loading.value = false;
	}
};

const topUpCard = async () => {
	if (!isSupervisor.value) {
		setMessage(__("A POS supervisor is required for this action."), "warning");
		return;
	}

	loading.value = true;
	setMessage("");
	try {
		const response = await frappe.call({
			method: "posawesome.posawesome.api.gift_cards.top_up_gift_card",
			args: {
				pos_profile: posProfile.value?.name,
				cashier: currentCashier.value?.user,
				gift_card_code: cardCode.value,
				amount: flt(amount.value || 0),
			},
		});
		const card = response?.message || {};
		balance.value = flt(card.current_balance || 0);
		status.value = card.status || "Active";
		mode.value = "check";
		setMessage(__("Gift card topped up successfully."), "success");
	} catch (error) {
		setMessage(error?.message || __("Unable to top up gift card."), "error");
	} finally {
		loading.value = false;
	}
};
</script>

<style scoped>
.gift-cards-view {
	margin: 12px;
	border-radius: 20px;
	overflow: hidden;
}

.gift-cards-view__header {
	padding: 20px 20px 0;
}

.gift-cards-view__hero {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	padding: 24px;
	border-radius: 22px;
	background:
		radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.18), transparent 38%),
		linear-gradient(145deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-surface), 0.92));
	border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.gift-cards-view__hero-copy {
	max-width: 640px;
}

.gift-cards-view__hero-badges {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
}

.gift-cards-view__badge {
	display: inline-flex;
	align-items: center;
	padding: 8px 12px;
	border-radius: 999px;
	font-size: 0.78rem;
	font-weight: 700;
	background: rgba(var(--v-theme-surface), 0.88);
	color: var(--pos-text-primary);
	border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.gift-cards-view__badge--soft {
	background: rgba(var(--v-theme-primary), 0.12);
}

.gift-cards-view__eyebrow {
	margin: 0 0 6px;
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.gift-cards-view__title {
	margin: 0;
	font-size: 1.25rem;
	color: var(--pos-text-primary);
}

.gift-cards-view__subtitle {
	margin: 8px 0 0;
	color: var(--pos-text-secondary);
}

.gift-cards-view__body {
	display: flex;
	flex-direction: column;
	gap: 14px;
	padding: 20px;
}

.gift-cards-view__panel {
	padding: 18px;
	border-radius: 18px;
	border: 1px solid var(--pos-border-light);
	background: linear-gradient(180deg, rgba(var(--v-theme-surface), 0.96), var(--pos-surface-raised));
}

.gift-cards-view__panel--hero {
	background:
		radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.1), transparent 42%),
		linear-gradient(180deg, rgba(var(--v-theme-surface), 0.98), var(--pos-surface-muted));
}

.gift-cards-view__scan-tip {
	display: flex;
	align-items: stretch;
	justify-content: space-between;
	gap: 16px;
}

.gift-cards-view__scan-copy h3 {
	margin: 4px 0 8px;
	font-size: 1.05rem;
	color: var(--pos-text-primary);
}

.gift-cards-view__scan-copy p:last-child {
	margin: 0;
	color: var(--pos-text-secondary);
}

.gift-cards-view__highlights {
	display: grid;
	grid-template-columns: repeat(2, minmax(140px, 1fr));
	gap: 10px;
}

.gift-cards-view__highlight {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 12px 14px;
	border-radius: 16px;
	background: rgba(var(--v-theme-primary), 0.08);
	border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.gift-cards-view__highlight span,
.gift-cards-view__section-label {
	font-size: 0.74rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.gift-cards-view__highlight strong {
	font-size: 0.96rem;
	color: var(--pos-text-primary);
}

.gift-cards-view__modes {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.gift-cards-view__form-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 12px;
}

.gift-cards-view__form-title {
	margin: 4px 0 0;
	font-size: 1.02rem;
	color: var(--pos-text-primary);
}

.gift-cards-view__mini-note {
	display: inline-flex;
	align-items: center;
	padding: 8px 10px;
	border-radius: 999px;
	background: var(--pos-surface-muted);
	color: var(--pos-text-secondary);
	font-size: 0.8rem;
}

.gift-cards-view__stats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.gift-cards-view__stat {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 16px;
	border-radius: 16px;
	border: 1px solid rgba(var(--v-theme-primary), 0.1);
	background:
		linear-gradient(180deg, rgba(var(--v-theme-primary), 0.04), transparent 32%), var(--pos-surface-muted);
}

.gift-cards-view__stat span {
	font-size: 0.78rem;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--pos-text-secondary);
}

.gift-cards-view__stat strong {
	font-size: 1.02rem;
	color: var(--pos-text-primary);
}

.gift-cards-view__stat small {
	color: var(--pos-text-secondary);
	font-size: 0.8rem;
	line-height: 1.45;
}

.gift-cards-view__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

@media (max-width: 960px) {
	.gift-cards-view__hero,
	.gift-cards-view__scan-tip,
	.gift-cards-view__form-header {
		flex-direction: column;
	}

	.gift-cards-view__hero-badges {
		justify-content: flex-start;
	}

	.gift-cards-view__highlights,
	.gift-cards-view__stats {
		grid-template-columns: 1fr;
	}
}
</style>
