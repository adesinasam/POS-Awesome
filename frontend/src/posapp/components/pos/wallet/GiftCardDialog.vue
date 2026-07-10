<template>
	<v-dialog
		:model-value="modelValue"
		max-width="520"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<v-card class="gift-card-dialog">
			<div class="gift-card-dialog__header">
				<div class="gift-card-dialog__header-copy">
					<p class="gift-card-dialog__eyebrow">{{ __("Gift Card") }}</p>
					<h3 class="gift-card-dialog__title">{{ __("Gift Card") }}</h3>
					<p class="gift-card-dialog__subtitle">
						{{ __("Scan or enter a gift card code to check balance or redeem.") }}
					</p>
				</div>
				<div class="gift-card-dialog__hero-chip">
					{{ modeMeta.badge }}
				</div>
			</div>

			<v-card-text class="gift-card-dialog__content">
				<div v-if="isSupervisor" class="gift-card-dialog__modes">
					<v-btn
						:variant="mode === 'issue' ? 'flat' : 'tonal'"
						:color="mode === 'issue' ? 'primary' : undefined"
						size="small"
						@click="$emit('set-mode', 'issue')"
					>
						{{ __("Issue New Card") }}
					</v-btn>
					<v-btn
						:variant="mode === 'top_up' ? 'flat' : 'tonal'"
						:color="mode === 'top_up' ? 'primary' : undefined"
						size="small"
						@click="$emit('set-mode', 'top_up')"
					>
						{{ __("Top Up Card") }}
					</v-btn>
					<v-btn
						:variant="mode === 'redeem' ? 'flat' : 'tonal'"
						:color="mode === 'redeem' ? 'primary' : undefined"
						size="small"
						@click="$emit('set-mode', 'redeem')"
					>
						{{ __("Redeem") }}
					</v-btn>
				</div>

				<div class="gift-card-dialog__scan-banner">
					<div>
						<p class="gift-card-dialog__section-label">{{ modeMeta.label }}</p>
						<h4>{{ modeMeta.title }}</h4>
						<p>{{ modeMeta.description }}</p>
					</div>
					<span class="gift-card-dialog__scan-chip">{{ __("Barcode / QR Ready") }}</span>
				</div>

				<v-text-field
					:model-value="cardCode"
					:label="__('Gift Card Code')"
					variant="solo"
					density="compact"
					hide-details
					@update:model-value="$emit('update:cardCode', $event)"
				/>

				<div class="gift-card-dialog__stats">
					<div class="gift-card-dialog__stat">
						<span>{{ __("Status") }}</span>
						<strong>{{ status || __("Unknown") }}</strong>
					</div>
					<div class="gift-card-dialog__stat">
						<span>{{ __("Balance") }}</span>
						<strong>{{ balance }}</strong>
					</div>
					<div class="gift-card-dialog__stat">
						<span>{{ mode === "redeem" ? __("Applying") : __("Amount") }}</span>
						<strong>{{ redeemAmountDisplay }}</strong>
					</div>
				</div>

				<v-text-field
					v-if="mode === 'redeem'"
					:model-value="redeemAmount"
					:label="__('Redeem Amount')"
					variant="solo"
					density="compact"
					hide-details
					@update:model-value="$emit('update:redeemAmount', $event)"
				/>

				<v-text-field
					v-else
					:model-value="redeemAmount"
					:label="mode === 'issue' ? __('Initial Amount') : __('Top Up Amount')"
					variant="solo"
					density="compact"
					hide-details
					@update:model-value="$emit('update:redeemAmount', $event)"
				/>

				<p v-if="mode === 'redeem'" class="gift-card-dialog__hint">
					{{
						__(
							"Apply only the amount you want to redeem on this invoice. The remaining balance stays on the card.",
						)
					}}
				</p>

				<p v-if="errorMessage" class="gift-card-dialog__error">{{ errorMessage }}</p>
			</v-card-text>

			<v-card-actions class="gift-card-dialog__actions">
				<v-btn variant="text" @click="$emit('update:modelValue', false)">
					{{ __("Close") }}
				</v-btn>
				<v-btn variant="tonal" :disabled="loading" @click="$emit('check-balance')">
					{{ __("Check Balance") }}
				</v-btn>
				<v-btn
					v-if="mode === 'redeem'"
					color="primary"
					variant="flat"
					:disabled="loading"
					@click="$emit('apply-redemption')"
				>
					{{ __("Apply Redemption") }}
				</v-btn>
				<v-btn
					v-else-if="mode === 'issue'"
					color="primary"
					variant="flat"
					:disabled="loading"
					@click="$emit('issue-card')"
				>
					{{ __("Issue New Card") }}
				</v-btn>
				<v-btn
					v-else
					color="primary"
					variant="flat"
					:disabled="loading"
					@click="$emit('top-up-card')"
				>
					{{ __("Top Up Card") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
	modelValue: {
		type: Boolean,
		default: false,
	},
	cardCode: {
		type: String,
		default: "",
	},
	redeemAmount: {
		type: [Number, String],
		default: 0,
	},
	balance: {
		type: [Number, String],
		default: 0,
	},
	status: {
		type: String,
		default: "",
	},
	isSupervisor: {
		type: Boolean,
		default: false,
	},
	loading: {
		type: Boolean,
		default: false,
	},
	mode: {
		type: String,
		default: "redeem",
	},
	errorMessage: {
		type: String,
		default: "",
	},
});

defineEmits([
	"update:modelValue",
	"update:cardCode",
	"update:redeemAmount",
	"set-mode",
	"check-balance",
	"apply-redemption",
	"issue-card",
	"top-up-card",
]);

const __ = window.__;

const redeemAmountDisplay = computed(() => {
	const amount = props.redeemAmount;
	return amount === null || amount === undefined || amount === "" ? "0" : String(amount);
});

const modeMeta = computed(() => {
	if (props.mode === "issue") {
		return {
			badge: __("Issue Mode"),
			label: __("Create"),
			title: __("Create and preload a new gift card"),
			description: __("Generate a fresh prepaid card and start it with an opening balance."),
		};
	}
	if (props.mode === "top_up") {
		return {
			badge: __("Top Up Mode"),
			label: __("Reload"),
			title: __("Add more value to an existing gift card"),
			description: __("Scan an existing card and top it up without leaving the payment flow."),
		};
	}
	return {
		badge: __("Redeem Mode"),
		label: __("Redeem"),
		title: __("Check live balance before applying redemption"),
		description: __("Use one field for manual code entry, barcode scans, or QR scans."),
	};
});
</script>

<style scoped>
.gift-card-dialog {
	border-radius: var(--pos-radius-lg);
	overflow: hidden;
	background:
		radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.14), transparent 40%),
		var(--pos-surface-raised);
}

.gift-card-dialog__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--pos-space-3);
	padding: var(--pos-space-4) var(--pos-space-4) 0;
}

.gift-card-dialog__header-copy {
	max-width: 420px;
}

.gift-card-dialog__eyebrow,
.gift-card-dialog__section-label {
	margin: 0;
	font-size: 0.74rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.gift-card-dialog__hero-chip,
.gift-card-dialog__scan-chip {
	display: inline-flex;
	align-items: center;
	padding: 8px 12px;
	border-radius: 999px;
	font-size: 0.78rem;
	font-weight: 700;
	border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.gift-card-dialog__hero-chip {
	background: rgba(var(--v-theme-primary), 0.12);
	color: var(--pos-text-primary);
}

.gift-card-dialog__title {
	margin: 0;
	font-size: 1.16rem;
	font-weight: 700;
}

.gift-card-dialog__subtitle {
	margin: 6px 0 0;
	color: var(--pos-text-secondary);
	font-size: 0.92rem;
}

.gift-card-dialog__content {
	display: flex;
	flex-direction: column;
	gap: var(--pos-space-3);
}

.gift-card-dialog__scan-banner {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--pos-space-3);
	padding: 14px 16px;
	border-radius: var(--pos-radius-md);
	background:
		radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.1), transparent 38%),
		var(--pos-surface-muted);
	border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.gift-card-dialog__scan-banner h4 {
	margin: 4px 0 6px;
	font-size: 1rem;
	color: var(--pos-text-primary);
}

.gift-card-dialog__scan-banner p:last-child {
	margin: 0;
	color: var(--pos-text-secondary);
	font-size: 0.9rem;
}

.gift-card-dialog__scan-chip {
	background: rgba(var(--v-theme-surface), 0.82);
	color: var(--pos-text-primary);
	white-space: nowrap;
}

.gift-card-dialog__modes {
	display: flex;
	flex-wrap: wrap;
	gap: var(--pos-space-2);
}

.gift-card-dialog__stats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;
}

.gift-card-dialog__stat {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 12px 14px;
	border-radius: 14px;
	border: 1px solid rgba(var(--v-theme-primary), 0.1);
	background: rgba(var(--v-theme-primary), 0.05);
}

.gift-card-dialog__stat span {
	font-size: 0.74rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.gift-card-dialog__stat strong {
	color: var(--pos-text-primary);
	font-size: 0.98rem;
}

.gift-card-dialog__hint {
	margin: 0;
	color: var(--pos-text-secondary);
	font-size: 0.88rem;
	line-height: 1.5;
}

.gift-card-dialog__actions {
	padding: 0 var(--pos-space-4) var(--pos-space-4);
	gap: var(--pos-space-2);
}

.gift-card-dialog__error {
	margin: 0;
	color: rgb(var(--v-theme-error));
	font-weight: 600;
}

@media (max-width: 768px) {
	.gift-card-dialog__header,
	.gift-card-dialog__scan-banner {
		flex-direction: column;
	}

	.gift-card-dialog__stats {
		grid-template-columns: 1fr;
	}
}
</style>
