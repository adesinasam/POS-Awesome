<template>
  <div>
    <v-card class="selection mx-auto bg-grey-lighten-5 pa-1" style="max-height: 76vh; height: 76vh">
      <v-progress-linear :active="loading" :indeterminate="loading" absolute location="top" color="info"></v-progress-linear>
      <div class="overflow-y-auto px-2 pt-2" style="max-height: 75vh">
        
        <!-- Payment Summary -->
        <v-row v-if="invoice_doc" class="px-1 py-0">
          <v-col cols="7">
            <v-text-field
              variant="outlined"
              color="primary"
              :label="frappe._('Paid Amount')"
              bg-color="white"
              hide-details
              v-model="total_payments_display"
              readonly
              :prefix="currencySymbol(invoice_doc.currency)"
              density="compact"
            ></v-text-field>
          </v-col>
          <v-col cols="5">
            <v-text-field
              variant="outlined"
              color="primary"
              :label="frappe._(diff_lable)"
              bg-color="white"
              hide-details
              :value="formatCurrency(diff_payment)"
              readonly
              :prefix="currencySymbol(invoice_doc.currency)"
              density="compact"
            ></v-text-field>
          </v-col>

          <!-- Paid Change -->
          <v-col cols="7" v-if="credit_change > 0 && !invoice_doc.is_return">
            <v-text-field
              variant="outlined"
              color="primary"
              :label="frappe._('Paid Change')"
              bg-color="white"
              v-model.number="paid_change"
              :prefix="currencySymbol(invoice_doc.currency)"
              :rules="paid_change_rules"
              density="compact"
              readonly
              type="number"
            ></v-text-field>
          </v-col>

          <!-- Credit Change -->
          <v-col cols="5" v-if="credit_change > 0 && !invoice_doc.is_return">
            <v-text-field
              variant="outlined"
              color="primary"
              :label="frappe._('Credit Change')"
              bg-color="white"
              hide-details
              :value="formatCurrency(credit_change)"
              readonly
              :prefix="currencySymbol(invoice_doc.currency)"
              density="compact"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-divider></v-divider>

        <!-- Payment Inputs -->
        <div v-if="is_cashback">
          <v-row class="payments px-1 py-0" v-for="(payment, index) in invoice_doc.payments" :key="payment.name">
            <v-col cols="6" v-if="!is_mpesa_c2b_payment(payment)">
              <v-text-field
                density="compact"
                variant="outlined"
                color="primary"
                :label="frappe._(payment.mode_of_payment)"
                bg-color="white"
                hide-details
                v-model.number="payment.amount"
                :rules="[isNumber]"
                :prefix="currencySymbol(invoice_doc.currency)"
                @focus="set_rest_amount(payment.idx)"
                :readonly="invoice_doc.is_return || (payment.mode_of_payment.toLowerCase() === 'cash' && !is_credit_sale)"
              ></v-text-field>
            </v-col>
            <v-col cols="6" v-if="!is_mpesa_c2b_payment(payment)">
              <v-btn block color="primary" theme="dark" @click="set_full_amount(payment.idx)">
                {{ payment.mode_of_payment }}
              </v-btn>
            </v-col>

            <!-- M-Pesa Payment Button -->
            <v-col cols="12" v-if="is_mpesa_c2b_payment(payment)" class="pl-3">
              <v-btn block color="success" theme="dark" @click="mpesa_c2b_dialog(payment)">
                {{ __("Get Payments") }} {{ payment.mode_of_payment }}
              </v-btn>
            </v-col>

            <!-- Request Payment for Phone Type -->
            <v-col cols="3" v-if="payment.type === 'Phone' && payment.amount > 0 && request_payment_field" class="pl-1">
              <v-btn block color="success" theme="dark" :disabled="payment.amount === 0" @click="request_payment(payment)">
                {{ __("Request") }}
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <!-- Loyalty Points Redemption -->
        <v-row class="payments px-1 py-0" v-if="invoice_doc && available_points_amount > 0 && !invoice_doc.is_return">
          <v-col cols="7">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('Redeem Loyalty Points')"
              bg-color="white"
              hide-details
              v-model.number="loyalty_amount"
              type="number"
              :prefix="currencySymbol(invoice_doc.currency)"
            ></v-text-field>
          </v-col>
          <v-col cols="5">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('You can redeem up to')"
              bg-color="white"
              hide-details
              :value="formatFloat(available_points_amount)"
              :prefix="currencySymbol(invoice_doc.currency)"
              readonly
            ></v-text-field>
          </v-col>
        </v-row>

        <!-- Customer Credit Redemption -->
        <v-row class="payments px-1 py-0" v-if="invoice_doc && available_customer_credit > 0 && !invoice_doc.is_return && redeem_customer_credit">
          <v-col cols="7">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('Redeemed Customer Credit')"
              bg-color="white"
              hide-details
              v-model.number="redeemed_customer_credit"
              type="number"
              :prefix="currencySymbol(invoice_doc.currency)"
              readonly
            ></v-text-field>
          </v-col>
          <v-col cols="5">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('You can redeem credit up to')"
              bg-color="white"
              hide-details
              :value="formatCurrency(available_customer_credit)"
              :prefix="currencySymbol(invoice_doc.currency)"
              readonly
            ></v-text-field>
          </v-col>
        </v-row>

        <v-divider></v-divider>

        <!-- Invoice Totals -->
        <v-row class="px-1 py-0">
          <v-col cols="6">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('Net Total')"
              bg-color="white"
              :value="formatCurrency(invoice_doc.net_total)"
              readonly
              :prefix="currencySymbol(invoice_doc.currency)"
			  persistent-placeholder
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('Tax and Charges')"
              bg-color="white"
              hide-details
              :value="formatCurrency(invoice_doc.total_taxes_and_charges)"
              readonly
              :prefix="currencySymbol(invoice_doc.currency)"
			  persistent-placeholder
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('Total Amount')"
              bg-color="white"
              hide-details
              :value="formatCurrency(invoice_doc.total)"
              readonly
              :prefix="currencySymbol(invoice_doc.currency)"
			  persistent-placeholder
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('Discount Amount')"
              bg-color="white"
              hide-details
              :value="formatCurrency(invoice_doc.discount_amount)"
              readonly
              :prefix="currencySymbol(invoice_doc.currency)"
			  persistent-placeholder
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('Grand Total')"
              bg-color="white"
              hide-details
              :value="formatCurrency(invoice_doc.grand_total)"
              readonly
              :prefix="currencySymbol(invoice_doc.currency)"
			  persistent-placeholder
            ></v-text-field>
          </v-col>
          <v-col v-if="invoice_doc.rounded_total" cols="6">
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('Rounded Total')"
              bg-color="white"
              hide-details
              :value="formatCurrency(invoice_doc.rounded_total)"
              readonly
              :prefix="currencySymbol(invoice_doc.currency)"
			  persistent-placeholder
            ></v-text-field>
          </v-col>

          <!-- Delivery Date and Address (if applicable) -->
          <v-col cols="6" v-if="pos_profile.posa_allow_sales_order && invoiceType === 'Order'">
            <v-menu ref="order_delivery_date" v-model="order_delivery_date" :close-on-content-click="false" transition="scale-transition" density="default">
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="invoice_doc.posa_delivery_date"
                  :label="frappe._('Delivery Date')"
                  readonly
                  variant="outlined"
                  density="compact"
                  bg-color="white"
                  clearable
                  color="primary"
                  hide-details
                  v-bind="attrs"
                  v-on="on"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="new_delivery_date"
                no-title
                scrollable
                color="primary"
                :min="frappe.datetime.now_date()"
                @input="order_delivery_date = false; update_delivery_date()"
              ></v-date-picker>
            </v-menu>
          </v-col>
          <v-col cols="12" v-if="invoice_doc.posa_delivery_date">
            <v-autocomplete
              density="compact"
              clearable
              auto-select-first
              variant="outlined"
              color="primary"
              :label="frappe._('Address')"
              v-model="invoice_doc.shipping_address_name"
              :items="addresses"
              item-title="address_title"
              item-value="name"
              bg-color="white"
              no-data-text="Address not found"
              hide-details
              :customFilter="addressFilter"
              append-icon="mdi-plus"
              @click:append="new_address"
            >
              <template v-slot:item="{ item }">
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title class="text-primary text-subtitle-1">
                      <div v-html="item.address_title"></div>
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <div v-html="item.address_line1"></div>
                    </v-list-item-subtitle>
                    <v-list-item-subtitle v-if="item.address_line2">
                      <div v-html="item.address_line2"></div>
                    </v-list-item-subtitle>
                    <v-list-item-subtitle v-if="item.city">
                      <div v-html="item.city"></div>
                    </v-list-item-subtitle>
                    <v-list-item-subtitle v-if="item.state">
                      <div v-html="item.state"></div>
                    </v-list-item-subtitle>
                    <v-list-item-subtitle v-if="item.country">
                      <div v-html="item.country"></div>
                    </v-list-item-subtitle>
                    <v-list-item-subtitle v-if="item.mobile_no">
                      <div v-html="item.mobile_no"></div>
                    </v-list-item-subtitle>
                    <v-list-item-subtitle v-if="item.address_type">
                      <div v-html="item.address_type"></div>
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </template>
            </v-autocomplete>
          </v-col>

          <!-- Additional Notes -->
          <v-col cols="12" v-if="pos_profile.posa_display_additional_notes">
            <v-textarea
              class="pa-0"
              variant="outlined"
              density="compact"
              bg-color="white"
              clearable
              color="primary"
              auto-grow
              rows="2"
              :label="frappe._('Additional Notes')"
              v-model="invoice_doc.posa_notes"
            ></v-textarea>
          </v-col>
        </v-row>

        <!-- Customer Purchase Order (if applicable) -->
        <div v-if="pos_profile.posa_allow_customer_purchase_order">
          <v-divider></v-divider>
          <v-row class="px-1 py-0" justify="center" align="start">
            <v-col cols="6">
              <v-text-field
                v-model="invoice_doc.po_no"
                :label="frappe._('Purchase Order')"
                variant="outlined"
                density="compact"
                bg-color="white"
                clearable
                color="primary"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-menu ref="po_date_menu" v-model="po_date_menu" :close-on-content-click="false" transition="scale-transition">
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="invoice_doc.po_date"
                    :label="frappe._('Purchase Order Date')"
                    readonly
                    variant="outlined"
                    density="compact"
                    hide-details
                    v-bind="attrs"
                    v-on="on"
                    color="primary"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="new_po_date"
                  no-title
                  scrollable
                  color="primary"
                  @input="po_date_menu = false; update_po_date()"
                ></v-date-picker>
              </v-menu>
            </v-col>
          </v-row>
        </div>

        <v-divider></v-divider>

        <!-- Switches for Write Off and Credit Sale -->
        <v-row class="px-1 py-0" align="start" no-gutters>
          <v-col cols="6" v-if="pos_profile.posa_allow_write_off_change && credit_change > 0 && !invoice_doc.is_return">
            <v-switch
              v-model="is_write_off_change"
              flat
              :label="frappe._('Write Off Difference Amount')"
              class="my-0 py-0"
            ></v-switch>
          </v-col>
          <v-col cols="6" v-if="pos_profile.posa_allow_credit_sale && !invoice_doc.is_return">
            <v-switch
              v-model="is_credit_sale"
              :label="frappe._('Credit Sale?')"
            ></v-switch>
          </v-col>
          <v-col cols="6" v-if="invoice_doc.is_return && pos_profile.use_cashback">
            <v-switch
              v-model="is_cashback"
              flat
              :label="frappe._('Cashback?')"
              class="my-0 py-0"
            ></v-switch>
          </v-col>
          <v-col cols="6" v-if="is_credit_sale">
            <v-menu ref="date_menu" v-model="date_menu" :close-on-content-click="false" transition="scale-transition">
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="invoice_doc.due_date"
                  :label="frappe._('Due Date')"
                  readonly
                  variant="outlined"
                  density="compact"
                  hide-details
                  v-bind="attrs"
                  v-on="on"
                  color="primary"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="new_credit_due_date"
                no-title
                scrollable
                color="primary"
                :min="frappe.datetime.now_date()"
                @input="date_menu = false; update_credit_due_date()"
              ></v-date-picker>
            </v-menu>
          </v-col>
          <v-col cols="6" v-if="!invoice_doc.is_return && pos_profile.use_customer_credit">
            <v-switch
              v-model="redeem_customer_credit"
              flat
              :label="frappe._('Use Customer Credit')"
              class="my-0 py-0"
              @change="get_available_credit(redeem_customer_credit)"
            ></v-switch>
          </v-col>
        </v-row>

        <!-- Customer Credit Details -->
        <div v-if="invoice_doc && available_customer_credit > 0 && !invoice_doc.is_return && redeem_customer_credit">
          <v-row v-for="(row, idx) in customer_credit_dict" :key="idx">
            <v-col cols="4">
              <div class="pa-2 py-3">{{ row.credit_origin }}</div>
            </v-col>
            <v-col cols="4">
              <v-text-field
                density="compact"
                variant="outlined"
                color="primary"
                :label="frappe._('Available Credit')"
                bg-color="white"
                hide-details
                :value="formatCurrency(row.total_credit)"
                readonly
                :prefix="currencySymbol(invoice_doc.currency)"
              ></v-text-field>
            </v-col>
            <v-col cols="4">
              <v-text-field
                density="compact"
                variant="outlined"
                color="primary"
                :label="frappe._('Redeem Credit')"
                bg-color="white"
                hide-details
                type="number"
                v-model.number="row.credit_to_redeem"
                :prefix="currencySymbol(invoice_doc.currency)"
              ></v-text-field>
            </v-col>
          </v-row>
        </div>

        <v-divider></v-divider>

        <!-- Sales Person Selection -->
        <v-row class="pb-0 mb-2" align="start">
          <v-col cols="12">
            <v-autocomplete
              density="compact"
              clearable
              variant="outlined"
              color="primary"
              :label="frappe._('Sales Person')"
              v-model="sales_person"
              :items="sales_persons"
              item-title="sales_person_name"
              item-value="name"
              bg-color="white"
              :no-data-text="__('Sales Person not found')"
              hide-details
              :customFilter="salesPersonFilter"
              append-icon="mdi-plus"
              @click:append="new_address"
              :disabled="readonly"
            >
              <template v-slot:item="{ item }">
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title class="text-primary text-subtitle-1">
                      <div v-html="item.sales_person_name"></div>
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="item.sales_person_name !== item.name">
                      <div v-html="`ID: ${item.name}`"></div>
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </template>
            </v-autocomplete>
          </v-col>
        </v-row>
      </div>
    </v-card>

    <!-- Action Buttons -->
    <v-card flat class="cards mb-0 mt-3 py-0">
      <v-row align="start" no-gutters>
        <v-col cols="6">
          <v-btn block size="large" color="primary" theme="dark" @click="submit" :disabled="vaildatPayment">
            {{ __("Submit") }}
          </v-btn>
        </v-col>
        <v-col cols="6" class="pl-1">
          <v-btn block size="large" color="success" theme="dark" @click="submit(undefined, false, true)" :disabled="vaildatPayment">
            {{ __("Submit & Print") }}
          </v-btn>
        </v-col>
        <v-col cols="12">
          <v-btn block class="mt-2 pa-1" size="large" color="error" theme="dark" @click="back_to_invoice">
            {{ __("Cancel Payment") }}
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Phone Payment Dialog -->
    <v-dialog v-model="phone_dialog" max-width="400px">
      <v-card>
        <v-card-title>
          <span class="text-h5 text-primary">{{ __("Confirm Mobile Number") }}</span>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-container>
            <v-text-field
              density="compact"
              variant="outlined"
              color="primary"
              :label="frappe._('Mobile Number')"
              bg-color="white"
              hide-details
              v-model="invoice_doc.contact_mobile"
              type="number"
            ></v-text-field>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" theme="dark" @click="phone_dialog = false">
            {{ __("Close") }}
          </v-btn>
          <v-btn color="primary" theme="dark" @click="request_payment">
            {{ __("Request") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import format from "../../format";
export default {
  mixins: [format],
  data() {
    return {
      loading: false,
      pos_profile: "",
      invoice_doc: "",
      loyalty_amount: 0,
      redeemed_customer_credit: 0,
      credit_change: 0,
      paid_change: 0,
      is_credit_sale: false,
      is_write_off_change: false,
      is_cashback: true,
      redeem_customer_credit: false,
      customer_credit_dict: [],
      phone_dialog: false,
      invoiceType: "Invoice",
      pos_settings: "",
      customer_info: "",
      mpesa_modes: [],
      sales_persons: [],
      sales_person: "",
      addresses: [],
      order_delivery_date: false,
      new_delivery_date: null,
      po_date_menu: false,
      new_po_date: null,
      date_menu: false,
      new_credit_due_date: null,
      paid_change_rules: [],
      is_return: false,
      // Flags to manage user interactions
      is_user_editing_paid_change: false,
    };
  },
  computed: {
    // Total payments including actual payments, loyalty, and redeemed credits
    total_payments() {
      let total = 0;

      if (this.invoice_doc && this.invoice_doc.payments) {
        this.invoice_doc.payments.forEach((payment) => {
          total += parseFloat(payment.amount) || 0;
        });
      }

      total += parseFloat(this.loyalty_amount) || 0;
      total += parseFloat(this.redeemed_customer_credit) || 0;

      return this.flt(total, this.currency_precision);
    },

    // Difference between invoice total and total payments
    diff_payment() {
      let invoice_total = this.flt(this.invoice_doc.rounded_total || this.invoice_doc.grand_total, this.currency_precision);
      let diff = this.flt(invoice_total - this.total_payments, this.currency_precision);
      
      // "To Be Paid" cannot be negative
      return diff >= 0 ? diff : 0;
    },

    // Change to be given back to the customer
    credit_change() {
      let invoice_total = this.flt(this.invoice_doc.rounded_total || this.invoice_doc.grand_total, this.currency_precision);
      let change = this.flt(this.total_payments - invoice_total, this.currency_precision);
      
      // Ensure that change cannot be negative
      return change > 0 ? change : 0;
    },

    // Label for the difference field
    diff_label() {
      return this.diff_payment > 0 ? "To Be Paid" : "Change";
    },

    // Displayed total payments
    total_payments_display() {
      return this.formatCurrency(this.total_payments);
    },

    // Available loyalty points amount
    available_points_amount() {
      let amount = 0;
      if (this.customer_info.loyalty_points) {
        amount = this.customer_info.loyalty_points * this.customer_info.conversion_factor;
      }
      return amount;
    },

    // Total available customer credit
    available_customer_credit() {
      return this.customer_credit_dict.reduce((total, row) => total + this.flt(row.total_credit), 0);
    },

    // Validation for payment submission
    vaildatPayment() {
      if (this.pos_profile.posa_allow_sales_order) {
        if (this.invoiceType === "Order" && !this.invoice_doc.posa_delivery_date) {
          return true;
        }
      }
      return false;
    },

    // Determine if the request payment field should be shown
    request_payment_field() {
      return this.pos_settings?.invoice_fields?.some(
        (el) => el.fieldtype === "Button" && el.fieldname === "request_for_payment"
      ) || false;
    },
  },
  watch: {
    // Watch diff_payment to update paid_change
    diff_payment(newVal) {
      if (!this.is_user_editing_paid_change) {
        this.paid_change = -newVal;
      }
    },

    // Watch paid_change to validate and update credit_change
    paid_change(newVal) {
      const changeLimit = -this.diff_payment;
      if (newVal > changeLimit) {
        this.paid_change = changeLimit;
        this.credit_change = 0;
        this.paid_change_rules = ["Paid change can not be greater than total change!"];
      } else {
        this.paid_change_rules = [];
        this.credit_change = this.flt(newVal - changeLimit, this.currency_precision);
      }
    },

    // Watch loyalty_amount to handle loyalty points redemption
    loyalty_amount(value) {
      if (value > this.available_points_amount) {
        this.invoice_doc.loyalty_amount = 0;
        this.invoice_doc.redeem_loyalty_points = 0;
        this.invoice_doc.loyalty_points = 0;
        this.loyalty_amount = 0;
        this.eventBus.emit("show_message", {
          title: `Loyalty Amount can not be more than ${this.available_points_amount}`,
          color: "error",
        });
      } else {
        this.invoice_doc.loyalty_amount = this.flt(this.loyalty_amount);
        this.invoice_doc.redeem_loyalty_points = 1;
        this.invoice_doc.loyalty_points = this.flt(this.loyalty_amount) / this.customer_info.conversion_factor;
      }
    },

    // Watch redeemed_customer_credit to validate
    redeemed_customer_credit(newVal) {
      if (newVal > this.available_customer_credit) {
        this.redeemed_customer_credit = this.available_customer_credit;
        this.eventBus.emit("show_message", {
          title: `You can redeem customer credit up to ${this.available_customer_credit}`,
          color: "error",
        });
      }
    },

    // Watch sales_person to update sales_team
    sales_person(newVal) {
      if (newVal) {
        this.invoice_doc.sales_team = [
          {
            sales_person: newVal,
            allocated_percentage: 100,
          },
        ];
      } else {
        this.invoice_doc.sales_team = [];
      }
    },

    // Watch is_credit_sale to reset cash payments
    is_credit_sale(newVal) {
    if (newVal) {
      // When credit sale is turned on, reset cash payments to 0
      this.reset_cash_payments();
    } else {
      // When credit sale is turned off, set the cash payment back to the invoice total
      this.invoice_doc.payments.forEach((payment) => {
        if (payment.mode_of_payment.toLowerCase() === 'cash') {
          payment.amount = this.invoice_doc.rounded_total || this.invoice_doc.grand_total;
        }
      });
    }
  },
  },
  methods: {
    // Back to Invoice View
    back_to_invoice() {
      this.eventBus.emit("show_payment", "false");
      this.eventBus.emit("set_customer_readonly", false);
    },

    // Reset Cash Payments when Credit Sale is Enabled
    reset_cash_payments() {
      this.invoice_doc.payments.forEach((payment) => {
        if (payment.mode_of_payment.toLowerCase() === 'cash') {
          payment.amount = 0;
        }
      });
    },

    // Submit Payment
    submit(event, payment_received = false, print = false) {
      if (!this.invoice_doc.is_return && this.total_payments < 0) {
        this.eventBus.emit("show_message", {
          title: `Payments not correct`,
          color: "error",
        });
        frappe.utils.play_sound("error");
        return;
      }

      // Validate phone payment
      let phone_payment_is_valid = true;
      if (!payment_received) {
        this.invoice_doc.payments.forEach((payment) => {
          if (
            payment.type === "Phone" &&
            ![0, "0", "", null, undefined].includes(payment.amount)
          ) {
            phone_payment_is_valid = false;
          }
        });
        if (!phone_payment_is_valid) {
          this.eventBus.emit("show_message", {
            title: __("Please request phone payment or use another payment method"),
            color: "error",
          });
          frappe.utils.play_sound("error");
          console.error("Phone payment not requested");
          return;
        }
      }

      // Validate partial payments
      if (
        !this.is_credit_sale &&
        !this.pos_profile.posa_allow_partial_payment &&
        this.total_payments < (this.invoice_doc.rounded_total || this.invoice_doc.grand_total)
      ) {
        this.eventBus.emit("show_message", {
          title: `The amount paid is not complete`,
          color: "error",
        });
        frappe.utils.play_sound("error");
        return;
      }

      if (
        this.pos_profile.posa_allow_partial_payment &&
        !this.pos_profile.posa_allow_credit_sale &&
        this.total_payments === 0
      ) {
        this.eventBus.emit("show_message", {
          title: `Please enter the amount paid`,
          color: "error",
        });
        frappe.utils.play_sound("error");
        return;
      }

      // Validate paid_change
      if (this.paid_change > -this.diff_payment) {
        this.eventBus.emit("show_message", {
          title: `Paid change cannot be greater than total change!`,
          color: "error",
        });
        frappe.utils.play_sound("error");
        return;
      }

      // Validate cashback
      let total_change = this.flt(this.flt(this.paid_change) + this.flt(-this.credit_change));
      if (this.is_cashback && total_change !== -this.diff_payment) {
        this.eventBus.emit("show_message", {
          title: `Error in change calculations!`,
          color: "error",
        });
        frappe.utils.play_sound("error");
        return;
      }

      // Validate customer credit redemption
      let credit_calc_check = this.customer_credit_dict.filter((row) => {
        return this.flt(row.credit_to_redeem) > this.flt(row.total_credit);
      });

      if (credit_calc_check.length > 0) {
        this.eventBus.emit("show_message", {
          title: `Redeemed credit cannot be greater than its total.`,
          color: "error",
        });
        frappe.utils.play_sound("error");
        return;
      }

      if (
        !this.invoice_doc.is_return &&
        this.redeemed_customer_credit > (this.invoice_doc.rounded_total || this.invoice_doc.grand_total)
      ) {
        this.eventBus.emit("show_message", {
          title: `Cannot redeem customer credit more than invoice total`,
          color: "error",
        });
        frappe.utils.play_sound("error");
        return;
      }

      // Proceed to submit the invoice
      this.submit_invoice(print);
    },

    // Submit Invoice to Backend
    submit_invoice(print) {
      let totalPayedAmount = 0;
      this.invoice_doc.payments.forEach((payment) => {
        payment.amount = this.flt(payment.amount);
        totalPayedAmount += payment.amount;
      });

      if (this.invoice_doc.is_return && totalPayedAmount === 0) {
        this.invoice_doc.is_pos = 0;
      }

      if (this.customer_credit_dict.length) {
        this.customer_credit_dict.forEach((row) => {
          row.credit_to_redeem = this.flt(row.credit_to_redeem);
        });
      }

      let data = {
        total_change: !this.invoice_doc.is_return ? -this.diff_payment : 0,
        paid_change: !this.invoice_doc.is_return ? this.paid_change : 0,
        credit_change: -this.credit_change,
        redeemed_customer_credit: this.redeemed_customer_credit,
        customer_credit_dict: this.customer_credit_dict,
        is_cashback: this.is_cashback,
      };

      const vm = this;
      frappe.call({
        method: "posawesome.posawesome.api.posapp.submit_invoice",
        args: {
          data: data,
          invoice: this.invoice_doc,
        },
        async: false,
        callback: function (r) {
          if (!r?.message) {
            vm.eventBus.emit("show_message", {
              title: `Error submitting invoice`,
              color: "error",
            });
            return;
          }
          if (print) {
            vm.load_print_page();
          }
          vm.customer_credit_dict = [];
          vm.redeem_customer_credit = false;
          vm.is_cashback = true;
          vm.sales_person = "";

          vm.eventBus.emit("set_last_invoice", vm.invoice_doc.name);
          vm.eventBus.emit("show_message", {
            title: `Invoice ${r.message.name} is Submitted`,
            color: "success",
          });
          frappe.utils.play_sound("submit");
          vm.addresses = [];
          vm.eventBus.emit("clear_invoice");
          vm.back_to_invoice();
          return;
        },
      });
    },

    // Set Full Amount for a Payment Method
    set_full_amount(idx) {
      this.invoice_doc.payments.forEach((payment) => {
        payment.amount =
          payment.idx === idx
            ? this.invoice_doc.rounded_total || this.invoice_doc.grand_total
            : 0;
      });
    },

    // Set Remaining Amount when a Payment Method is Focused
    set_rest_amount(idx) {
      this.invoice_doc.payments.forEach((payment) => {
        if (payment.idx === idx && payment.amount === 0 && this.diff_payment > 0) {
          payment.amount = this.diff_payment;
        }
      });
    },

    // Clear All Payment Amounts
    clear_all_amounts() {
      this.invoice_doc.payments.forEach((payment) => {
        payment.amount = 0;
      });
    },

    // Load Print Page
    load_print_page() {
      const print_format =
        this.pos_profile.print_format_for_online || this.pos_profile.print_format;
      const letter_head = this.pos_profile.letter_head || 0;
      const url =
        frappe.urllib.get_base_url() +
        "/printview?doctype=Sales%20Invoice&name=" +
        this.invoice_doc.name +
        "&trigger_print=1" +
        "&format=" +
        print_format +
        "&no_letterhead=" +
        letter_head;
      const printWindow = window.open(url, "Print");
      printWindow.addEventListener(
        "load",
        function () {
          printWindow.print();
          // Uncomment the following line to auto-close the print window after printing
          // printWindow.close();
        },
        true
      );
    },

    // Validate Due Date
    validate_due_date() {
      const today = frappe.datetime.now_date();
      const new_date = Date.parse(this.invoice_doc.due_date);
      const parse_today = Date.parse(today);
      if (new_date < parse_today) {
        this.invoice_doc.due_date = today;
      }
    },

    // Short Pay Shortcut (Ctrl+X)
    shortPay(e) {
      if (e.key === "x" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.submit();
      }
    },

    // Get Available Customer Credit
    get_available_credit(use_credit) {
      this.clear_all_amounts();
      if (use_credit) {
        frappe.call("posawesome.posawesome.api.posapp.get_available_credit", {
          customer: this.invoice_doc.customer,
          company: this.pos_profile.company,
        }).then((r) => {
          const data = r.message;
          if (data.length) {
            const amount = this.invoice_doc.rounded_total || this.invoice_doc.grand_total;
            let remainAmount = amount;

            data.forEach((row) => {
              if (remainAmount > 0) {
                if (remainAmount >= row.total_credit) {
                  row.credit_to_redeem = row.total_credit;
                  remainAmount -= row.total_credit;
                } else {
                  row.credit_to_redeem = remainAmount;
                  remainAmount = 0;
                }
              } else {
                row.credit_to_redeem = 0;
              }
            });

            this.customer_credit_dict = data;
          } else {
            this.customer_credit_dict = [];
          }
        });
      } else {
        this.customer_credit_dict = [];
      }
    },

    // Get Customer Addresses
    get_addresses() {
      const vm = this;
      if (!vm.invoice_doc) {
        return;
      }
      frappe.call({
        method: "posawesome.posawesome.api.posapp.get_customer_addresses",
        args: { customer: vm.invoice_doc.customer },
        async: true,
        callback: function (r) {
          if (!r.exc) {
            vm.addresses = r.message;
          } else {
            vm.addresses = [];
          }
        },
      });
    },

    // Filter Addresses
    addressFilter(item, queryText, itemText) {
      const searchText = queryText.toLowerCase();
      return (
        (item.address_title && item.address_title.toLowerCase().includes(searchText)) ||
        (item.address_line1 && item.address_line1.toLowerCase().includes(searchText)) ||
        (item.address_line2 && item.address_line2.toLowerCase().includes(searchText)) ||
        (item.city && item.city.toLowerCase().includes(searchText)) ||
        (item.name && item.name.toLowerCase().includes(searchText))
      );
    },

    // Open New Address Dialog
    new_address() {
      this.eventBus.emit("open_new_address", this.invoice_doc.customer);
    },

    // Get Sales Person Names
    get_sales_person_names() {
      const vm = this;
      if (vm.pos_profile.posa_local_storage && localStorage.sales_persons_storage) {
        vm.sales_persons = JSON.parse(localStorage.getItem("sales_persons_storage"));
      }
      frappe.call({
        method: "posawesome.posawesome.api.posapp.get_sales_person_names",
        callback: function (r) {
          if (r.message) {
            vm.sales_persons = r.message;
            if (vm.pos_profile.posa_local_storage) {
              localStorage.setItem("sales_persons_storage", JSON.stringify(r.message));
            }
          }
        },
      });
    },

    // Sales Person Filter
    salesPersonFilter(itemText, queryText, itemRow) {
      const item = itemRow.raw;
      const searchText = queryText.toLowerCase();
      return (
        (item.sales_person_name && item.sales_person_name.toLowerCase().includes(searchText)) ||
        (item.name && item.name.toLowerCase().includes(searchText))
      );
    },

    // Request Payment for Phone Type
    request_payment(payment) {
      this.phone_dialog = false;
      const vm = this;
      if (!this.invoice_doc.contact_mobile) {
        this.eventBus.emit("show_message", {
          title: __("Please set the customer's mobile number"),
          color: "error",
        });
        this.eventBus.emit("open_edit_customer");
        this.back_to_invoice();
        return;
      }
      this.eventBus.emit("freeze", { title: __("Waiting for payment...") });
      this.invoice_doc.payments.forEach((payment) => {
        payment.amount = this.flt(payment.amount);
      });
      let formData = { ...this.invoice_doc };
      formData["total_change"] = !this.invoice_doc.is_return ? -this.diff_payment : 0;
      formData["paid_change"] = !this.invoice_doc.is_return ? this.paid_change : 0;
      formData["credit_change"] = -this.credit_change;
      formData["redeemed_customer_credit"] = this.redeemed_customer_credit;
      formData["customer_credit_dict"] = this.customer_credit_dict;
      formData["is_cashback"] = this.is_cashback;

      frappe.call({
        method: "posawesome.posawesome.api.posapp.update_invoice",
        args: { data: formData },
        async: false,
        callback: function (r) {
          if (r.message) {
            vm.invoice_doc = r.message;
          }
        },
      }).then(() => {
        frappe.call({
          method: "posawesome.posawesome.api.posapp.create_payment_request",
          args: { doc: vm.invoice_doc },
        })
        .fail(() => {
          vm.eventBus.emit("unfreeze");
          vm.eventBus.emit("show_message", {
            title: __("Payment request failed"),
            color: "error",
          });
        })
        .then(({ message }) => {
          const payment_request_name = message.name;
          setTimeout(() => {
            frappe.db.get_value("Payment Request", payment_request_name, ["status", "grand_total"]).then(({ message }) => {
              if (message.status !== "Paid") {
                vm.eventBus.emit("unfreeze");
                vm.eventBus.emit("show_message", {
                  title: __("Payment Request took too long to respond. Please try requesting for payment again"),
                  color: "error",
                });
              } else {
                vm.eventBus.emit("unfreeze");
                vm.eventBus.emit("show_message", {
                  title: __("Payment of {0} received successfully.", [
                    vm.formatCurrency(message.grand_total, vm.invoice_doc.currency, 0),
                  ]),
                  color: "success",
                });
                frappe.db.get_doc("Sales Invoice", vm.invoice_doc.name).then((doc) => {
                  vm.invoice_doc = doc;
                  vm.submit(null, true);
                });
              }
            });
          }, 30000);
        });
      });
    },

    // Get M-Pesa Modes
    get_mpesa_modes() {
      const vm = this;
      frappe.call({
        method: "posawesome.posawesome.api.m_pesa.get_mpesa_mode_of_payment",
        args: { company: vm.pos_profile.company },
        async: true,
        callback: function (r) {
          if (!r.exc) {
            vm.mpesa_modes = r.message;
          } else {
            vm.mpesa_modes = [];
          }
        },
      });
    },

    // Check if Payment is M-Pesa C2B
    is_mpesa_c2b_payment(payment) {
      if (this.mpesa_modes.includes(payment.mode_of_payment) && payment.type === "Bank") {
        payment.amount = 0;
        return true;
      } else {
        return false;
      }
    },

    // Open M-Pesa Payment Dialog
    mpesa_c2b_dialog(payment) {
      const data = {
        company: this.pos_profile.company,
        mode_of_payment: payment.mode_of_payment,
        customer: this.invoice_doc.customer,
      };
      this.eventBus.emit("open_mpesa_payments", data);
    },

    // Set M-Pesa Payment
    set_mpesa_payment(payment) {
      this.pos_profile.use_customer_credit = true;
      this.redeem_customer_credit = true;
      const invoiceAmount = this.invoice_doc.rounded_total || this.invoice_doc.grand_total;
      let amount = payment.unallocated_amount > invoiceAmount ? invoiceAmount : payment.unallocated_amount;
      amount = amount > 0 ? amount : 0;
      const advance = {
        type: "Advance",
        credit_origin: payment.name,
        total_credit: this.flt(payment.unallocated_amount),
        credit_to_redeem: this.flt(amount),
      };
      this.clear_all_amounts();
      this.customer_credit_dict.push(advance);
    },

    // Update Delivery Date after selecting a date
    update_delivery_date() {
      this.invoice_doc.posa_delivery_date = this.formatDate(this.new_delivery_date);
    },

    // Update Purchase Order Date after selecting a date
    update_po_date() {
      this.invoice_doc.po_date = this.formatDate(this.new_po_date);
    },

    // Update Credit Due Date after selecting a date
    update_credit_due_date() {
      this.invoice_doc.due_date = this.formatDate(this.new_credit_due_date);
    },

    // Format Date to required string format
    formatDate(date) {
      if (!date) return null;
      const d = new Date(date);
      const year = d.getFullYear();
      const month = (`0${d.getMonth() + 1}`).slice(-2);
      const day = (`0${d.getDate()}`).slice(-2);
      return `${year}-${month}-${day}`;
    },
  },
  mounted() {
    this.$nextTick(() => {
      // Listen to various events
      this.eventBus.on("send_invoice_doc_payment", (invoice_doc) => {
        this.invoice_doc = invoice_doc;
        const default_payment = this.invoice_doc.payments.find(
          (payment) => payment.default === 1
        );
        this.is_credit_sale = false;
        this.is_write_off_change = false;
        if (default_payment && !invoice_doc.is_return) {
          default_payment.amount = this.flt(
            invoice_doc.rounded_total || invoice_doc.grand_total,
            this.currency_precision
          );
        }
        if (invoice_doc.is_return) {
          this.is_return = true;
          invoice_doc.payments.forEach((payment) => {
            payment.amount = 0;
            payment.base_amount = 0;
          });
        }
        this.loyalty_amount = 0;
        this.redeemed_customer_credit = 0;
        this.get_addresses();
        this.get_sales_person_names();
      });

      this.eventBus.on("register_pos_profile", (data) => {
        this.pos_profile = data.pos_profile;
        this.get_mpesa_modes();
      });

      this.eventBus.on("add_the_new_address", (data) => {
        this.addresses.push(data);
        this.$forceUpdate();
      });

      this.eventBus.on("update_invoice_type", (data) => {
        this.invoiceType = data;
        if (this.invoice_doc && data !== "Order") {
          this.invoice_doc.posa_delivery_date = null;
          this.invoice_doc.posa_notes = null;
          this.invoice_doc.shipping_address_name = null;
        }
      });

      this.eventBus.on("update_customer", (customer) => {
        if (this.customer !== customer) {
          this.customer_credit_dict = [];
          this.redeem_customer_credit = false;
          this.is_cashback = true;
        }
      });

      this.eventBus.on("set_pos_settings", (data) => {
        this.pos_settings = data;
      });

      this.eventBus.on("set_customer_info_to_edit", (data) => {
        this.customer_info = data;
      });

      this.eventBus.on("set_mpesa_payment", (data) => {
        this.set_mpesa_payment(data);
      });
    });

    // Listen for keyboard shortcuts
    document.addEventListener("keydown", this.shortPay.bind(this));
  },
  beforeUnmount() {
    // Remove event listeners
    this.eventBus.$off("send_invoice_doc_payment");
    this.eventBus.$off("register_pos_profile");
    this.eventBus.$off("add_the_new_address");
    this.eventBus.$off("update_invoice_type");
    this.eventBus.$off("update_customer");
    this.eventBus.$off("set_pos_settings");
    this.eventBus.$off("set_customer_info_to_edit");
    this.eventBus.$off("set_mpesa_payment");
  },
  unmounted() {
    // Remove keyboard shortcut listener
    document.removeEventListener("keydown", this.shortPay);
  },
};
</script>
