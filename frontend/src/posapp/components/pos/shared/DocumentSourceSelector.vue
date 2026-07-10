<template>
	<div class="document-source-selector" role="tablist" :aria-label="ariaLabel">
		<v-btn
			v-for="option in options"
			:key="option.key"
			:color="option.color"
			:variant="isActive(option.key) ? 'flat' : 'tonal'"
			:size="compact ? 'small' : 'default'"
			class="document-source-selector__button"
			:class="{
				'document-source-selector__button--active': isActive(option.key),
				'document-source-selector__button--inactive': !isActive(option.key),
			}"
			:prepend-icon="option.icon"
			role="tab"
			:tabindex="isActive(option.key) ? 0 : -1"
			:aria-selected="isActive(option.key)"
			@click="$emit('update:modelValue', option.key)"
			@keydown="handleOptionKeydown($event, option.key)"
		>
			{{ option.label }}
		</v-btn>
	</div>
</template>

<script setup lang="ts">
import { nextTick, type PropType } from "vue";

import type { DocumentSourceOption } from "../../../utils/documentSources";

const props = defineProps({
	modelValue: {
		type: String,
		required: true,
	},
	options: {
		type: Array as PropType<DocumentSourceOption[]>,
		default: () => [],
	},
	compact: {
		type: Boolean,
		default: false,
	},
	ariaLabel: {
		type: String,
		default: "Document source",
	},
});

const emit = defineEmits(["update:modelValue"]);

function isActive(key: string) {
	return props.modelValue === key;
}

function focusTabButton(event: KeyboardEvent, index: number) {
	const container = (event.currentTarget as HTMLElement | null)?.parentElement;
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>("[role='tab']") || []);
	nextTick(() => {
		buttons[index]?.focus();
	});
}

function handleOptionKeydown(event: KeyboardEvent, key: string) {
	const currentIndex = props.options.findIndex((option) => option.key === key);
	if (currentIndex < 0 || props.options.length === 0) return;

	let nextIndex: number | null = null;
	if (event.key === "ArrowRight") {
		nextIndex = (currentIndex + 1) % props.options.length;
	} else if (event.key === "ArrowLeft") {
		nextIndex = (currentIndex - 1 + props.options.length) % props.options.length;
	} else if (event.key === "Home") {
		nextIndex = 0;
	} else if (event.key === "End") {
		nextIndex = props.options.length - 1;
	}

	if (nextIndex === null) return;
	event.preventDefault();
	const nextOption = props.options[nextIndex];
	if (nextOption) {
		emit("update:modelValue", nextOption.key);
		focusTabButton(event, nextIndex);
	}
}
</script>

<style scoped>
.document-source-selector {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: nowrap;
	min-width: 0;
}

.document-source-selector__button {
	flex: 1 1 0;
	min-width: 0;
	border-radius: 999px !important;
	font-weight: 700 !important;
	letter-spacing: 0.01em;
	text-transform: none !important;
	transition:
		transform 0.18s ease,
		box-shadow 0.18s ease,
		filter 0.18s ease;
}

.document-source-selector__button :deep(.v-btn__content) {
	min-width: 0;
	white-space: nowrap;
}

.document-source-selector__button--active {
	transform: translateY(-1px);
	box-shadow: 0 10px 22px rgba(15, 23, 42, 0.16) !important;
	filter: saturate(1.08);
}

.document-source-selector__button--inactive {
	opacity: 0.92;
}

@media (max-width: 640px) {
	.document-source-selector {
		gap: 6px;
	}

	.document-source-selector__button {
		padding-inline: 10px !important;
	}
}
</style>
