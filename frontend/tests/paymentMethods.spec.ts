// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";

import PaymentMethods from "../src/posapp/components/pos/payments/PaymentMethods.vue";

const BoxStub = defineComponent({
	setup(_, { slots }) {
		return () => h("div", {}, slots.default?.());
	},
});

const VBtnStub = defineComponent({
	name: "VBtnStub",
	props: {
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	emits: ["click"],
	setup(props, { slots, emit, attrs }) {
		return () =>
			h(
				"button",
				{
					type: "button",
					disabled: props.disabled,
					"data-test": attrs["data-test"],
					onClick: () => emit("click"),
				},
				slots.default?.(),
			);
	},
});

const VTextFieldStub = defineComponent({
	emits: ["change", "focus", "keydown"],
	setup(_, { attrs, emit }) {
		return () =>
			h("input", {
				...attrs,
				value: attrs.modelValue,
				onChange: (event: Event) => emit("change", event),
				onFocus: (event: FocusEvent) => emit("focus", event),
				onKeydown: (event: KeyboardEvent) => emit("keydown", event),
			});
	},
});

describe("PaymentMethods", () => {
	beforeEach(() => {
		(window as any).__ = (value: string) => value;
		(window as any).frappe = {
			_: (value: string) => value,
		};
	});

	it("does not show exact and remaining quick tender actions under the payment method button", async () => {
		const wrapper = mount(PaymentMethods, {
			props: {
				payments: [
					{
						name: "PAY-1",
						mode_of_payment: "Cash",
						type: "Cash",
						amount: 0,
						default: 1,
					},
				],
				currency: "PKR",
				isReturn: false,
				requestPaymentField: false,
				currencySymbol: () => "Rs ",
				formatCurrency: (value: number) => String(value),
				isNumber: () => true,
				getVisibleDenominations: () => [500, 1000],
				isCashLikePayment: () => true,
				isMpesaC2bPayment: () => false,
				isGiftCardPayment: () => false,
			},
			global: {
				components: {
					VRow: BoxStub,
					VCol: BoxStub,
					VBtn: VBtnStub,
					VTextField: VTextFieldStub,
				},
			},
		});

		expect(wrapper.text()).toContain("500");
		expect(wrapper.text()).toContain("1000");

		expect(wrapper.find('[data-test="payment-method-exact-Cash"]').exists()).toBe(false);
		expect(wrapper.find('[data-test="payment-method-remaining-Cash"]').exists()).toBe(false);
	});

	it("marks payment amounts as keyboard targets and blurs them on Enter", async () => {
		const wrapper = mount(PaymentMethods, {
			props: {
				payments: [
					{
						name: "PAY-1",
						mode_of_payment: "Cash",
						type: "Cash",
						amount: 0,
						default: 1,
					},
				],
				currency: "PKR",
				isReturn: false,
				requestPaymentField: false,
				currencySymbol: () => "Rs ",
				formatCurrency: (value: number) => String(value),
				isNumber: () => true,
				getVisibleDenominations: () => [],
				isCashLikePayment: () => true,
				isMpesaC2bPayment: () => false,
				isGiftCardPayment: () => false,
			},
			global: {
				components: {
					VRow: BoxStub,
					VCol: BoxStub,
					VBtn: VBtnStub,
					VTextField: VTextFieldStub,
				},
			},
		});

		const input = wrapper.get('input[data-pos-keyboard-target="payment-amount"]');
		const blurSpy = vi.spyOn(input.element as HTMLInputElement, "blur");

		await input.trigger("keydown", { key: "Enter" });

		expect(blurSpy).toHaveBeenCalledTimes(1);
	});
});
