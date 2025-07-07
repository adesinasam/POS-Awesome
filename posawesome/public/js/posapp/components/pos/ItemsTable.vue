<template>
  <div class="my-0 py-0 overflow-y-auto" :style="{ height: 'calc(var(--container-height) - 80px)', maxHeight: 'calc(var(--container-height) - 80px)' }">
    <v-data-table
      :headers="headers"
      :items="items"
      :theme="$theme.current"
      :expanded="expanded"
      show-expand
      item-value="posa_row_id"
      class="enhanced-table-items elevation-2"
      :items-per-page="itemsPerPage"
      expand-on-click
      density="compact"
      hide-default-footer
      :single-expand="true"
      :header-props="headerProps"
      @update:expanded="$emit('update:expanded', $event)"
      :search="itemSearch"
    >
      <template v-slot:item.qty="{ item }">
        <div class="amount-value">{{ formatFloat(item.qty) }}</div>
      </template>

      <template v-slot:item.rate="{ item }">
        <div class="currency-display">
          <span class="currency-symbol">{{ currencySymbol(displayCurrency) }}</span>
          <span class="amount-value">{{ formatCurrency(item.rate) }}</span>
        </div>
      </template>

      <template v-slot:item.amount="{ item }">
        <div class="currency-display">
          <span class="currency-symbol">{{ currencySymbol(displayCurrency) }}</span>
          <span class="amount-value">{{ formatCurrency(item.qty * item.rate) }}</span>
        </div>
      </template>

      <template v-slot:item.discount_value="{ item }">
        <div class="amount-value">
          {{ formatFloat(item.discount_percentage || (item.price_list_rate ? (item.discount_amount / item.price_list_rate) * 100 : 0)) }}%
        </div>
      </template>

      <template v-slot:item.discount_amount="{ item }">
        <div class="currency-display">
          <span class="currency-symbol">{{ currencySymbol(displayCurrency) }}</span>
          <span class="amount-value">{{ formatCurrency(item.discount_amount || 0) }}</span>
        </div>
      </template>

      <template v-slot:item.price_list_rate="{ item }">
        <div class="currency-display">
          <span class="currency-symbol">{{ currencySymbol(displayCurrency) }}</span>
          <span class="amount-value">{{ formatCurrency(item.price_list_rate) }}</span>
        </div>
      </template>

      <template v-slot:item.posa_is_offer="{ item }">
        <v-checkbox-btn v-model="item.posa_is_offer" class="center" @change="toggleOffer(item)"></v-checkbox-btn>
      </template>

      <template v-slot:expanded-row="{ columns: headers, item }">
        <td :colspan="headers.length" class="ma-0 pa-2">
          <v-row class="mb-3 action-buttons-container" dense>
            <v-col cols="auto">
              <v-btn :disabled="!!item.posa_is_replace" icon="mdi-trash-can-outline" size="large" color="error"
                variant="tonal" class="item-action-btn delete-btn mr-2" @click.stop="removeItem(item)">
                <v-icon size="large">mdi-trash-can-outline</v-icon>
              </v-btn>
            </v-col>
            <v-spacer></v-spacer>
            <v-col cols="auto" class="action-group">
              <v-btn :disabled="!!item.posa_is_replace" size="large" color="warning" variant="tonal"
                class="item-action-btn minus-btn mr-2" @click.stop="subtractOne(item)">
                <v-icon size="large">mdi-minus-circle-outline</v-icon>
              </v-btn>
              <v-btn :disabled="!!item.posa_is_replace" size="large" color="success" variant="tonal"
                class="item-action-btn plus-btn ml-2" @click.stop="addOne(item)">
                <v-icon size="large">mdi-plus-circle-outline</v-icon>
              </v-btn>
            </v-col>
          </v-row>

          <v-row dense class="item-details-form mb-2">
            <v-col cols="12" sm="4" class="field-with-icon">
              <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Item Code')"
                :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details v-model="item.item_code" disabled
                prepend-inner-icon="mdi-barcode"></v-text-field>
            </v-col>
            <v-col cols="12" sm="4" class="field-with-icon">
              <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('QTY')"
                :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details :model-value="formatFloat(item.qty)" @change="[
                  setFormatedQty(item, 'qty', null, false, $event.target.value),
                  calcStockQty(item, item.qty),
                ]" :rules="[isNumber]" :disabled="!!item.posa_is_replace"
                prepend-inner-icon="mdi-numeric"></v-text-field>
            </v-col>
            <v-col cols="12" sm="4" class="field-with-icon">
              <v-select density="compact" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" :label="frappe._('UOM')" v-model="item.uom"
                :items="item.item_uoms" variant="outlined" item-title="uom" item-value="uom" hide-details
                @update:model-value="calcUom(item, $event)"
                :disabled="!!item.posa_is_replace || (isReturnInvoice && invoice_doc.return_against)"
                prepend-inner-icon="mdi-weight"></v-select>
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Rate')"
                :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details :prefix="currencySymbol(pos_profile.currency)"
                :model-value="formatCurrency(item.rate)" @change="[
                  setFormatedCurrency(item, 'rate', null, false, $event),
                  calcPrices(item, $event.target.value, $event),
                ]" :rules="[isNumber]" id="rate" :disabled="!!item.posa_is_replace ||
                  !!item.posa_offer_applied ||
                  !pos_profile.posa_allow_user_to_edit_rate ||
                  (isReturnInvoice && invoice_doc.return_against)"></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Discount %')"
                :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details :model-value="formatFloat(item.discount_percentage)" @change="[
                  setFormatedCurrency(item, 'discount_percentage', null, true, $event),
                  calcPrices(item, $event.target.value, $event),
                ]" :rules="[isNumber]" id="discount_percentage" :disabled="!!item.posa_is_replace ||
                  item.posa_offer_applied ||
                  !pos_profile.posa_allow_user_to_edit_item_discount ||
                  (isReturnInvoice && invoice_doc.return_against)" suffix="%"></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field density="compact" variant="outlined" color="primary"
                :label="frappe._('Discount Amount')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                :model-value="formatCurrency(item.discount_amount || 0)" ref="discount"
                @change="(event) => { if (expanded && expanded.length === 1 && expanded[0] === item.posa_row_id) { calcPrices(item, event.target.value, { target: { id: 'discount_amount' } }); } }"
                :rules="['isNumber']" id="discount_amount"
                :disabled="!!item.posa_is_replace || item.posa_offer_applied || !pos_profile.posa_allow_user_to_edit_item_discount || (isReturnInvoice && invoice_doc.return_against)"
                :prefix="currencySymbol(pos_profile.currency)"></v-text-field>
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field density="compact" variant="outlined" color="primary"
                :label="frappe._('Price list Rate')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                :model-value="formatCurrency(item.price_list_rate)" disabled
                :prefix="currencySymbol(pos_profile.currency)"></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field density="compact" variant="outlined" color="primary"
                :label="frappe._('Available QTY')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                :model-value="formatFloat(item.actual_qty)" disabled></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Group')"
                :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details v-model="item.item_group" disabled></v-text-field>
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Stock QTY')"
                :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details :model-value="formatFloat(item.stock_qty)" disabled></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field density="compact" variant="outlined" color="primary" :label="frappe._('Stock UOM')"
                :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details v-model="item.stock_uom" disabled></v-text-field>
            </v-col>
            <v-col cols="12" sm="4" v-if="item.posa_offer_applied">
              <v-checkbox density="compact" :label="frappe._('Offer Applied')" v-model="item.posa_offer_applied"
                readonly hide-details class="mt-1"></v-checkbox>
            </v-col>

            <template v-if="item.has_serial_no == 1 || item.serial_no">
              <v-col cols="12" sm="4">
                <v-text-field density="compact" variant="outlined" color="primary"
                  :label="frappe._('Serial No QTY')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                  v-model="item.serial_no_selected_count" type="number" disabled></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-autocomplete v-model="item.serial_no_selected" :items="item.serial_no_data"
                  item-title="serial_no" variant="outlined" density="compact" chips color="primary" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field"
                  :label="frappe._('Serial No')" multiple
                  @update:model-value="setSerialNo(item)"></v-autocomplete>
              </v-col>
            </template>

            <template v-if="item.has_batch_no == 1 || item.batch_no">
              <v-col cols="12" sm="4">
                <v-text-field density="compact" variant="outlined" color="primary"
                  :label="frappe._('Batch No. Available QTY')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                  :model-value="formatFloat(item.actual_batch_qty)" disabled></v-text-field>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field density="compact" variant="outlined" color="primary"
                  :label="frappe._('Batch No Expiry Date')" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" hide-details
                  v-model="item.batch_no_expiry_date" disabled></v-text-field>
              </v-col>
              <v-col cols="12" sm="4">
                <v-autocomplete v-model="item.batch_no" :items="item.batch_no_data" item-title="batch_no"
                  variant="outlined" density="compact" color="primary" :bg-color="isDarkTheme ? '#1E1E1E' : 'white'" class="dark-field" :label="frappe._('Batch No')"
                  @update:model-value="setBatchQty(item, $event)" hide-details>
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props">
                      <!-- eslint-disable-next-line vue/no-v-text-v-html-on-component -->
                      <v-list-item-title v-html="item.raw.batch_no"></v-list-item-title>
                      <!-- eslint-disable-next-line vue/no-v-text-v-html-on-component -->
                      <v-list-item-subtitle v-html="`Available QTY  '${item.raw.batch_qty}' - Expiry Date ${item.raw.expiry_date}`"></v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-autocomplete>
              </v-col>
            </template>

            <v-col cols="12" sm="4" v-if="pos_profile.posa_allow_sales_order && invoiceType == 'Order'">
              <VueDatePicker
                v-model="item.posa_delivery_date"
                model-type="format"
                format="dd-MM-yyyy"
                :min-date="new Date()"
                auto-apply
                :dark="isDarkTheme"
                @update:model-value="validateDueDate(item)"
              />
            </v-col>
          </v-row>
        </td>
      </template>
    </v-data-table>
  </div>
</template>

<script>
export default {
  name: 'ItemsTable',
  props: {
    headers: Array,
    items: Array,
    expanded: Array,
    itemsPerPage: Number,
    itemSearch: String,
    pos_profile: Object,
    invoice_doc: Object,
    invoiceType: String,
    displayCurrency: String,
    formatFloat: Function,
    formatCurrency: Function,
    currencySymbol: Function,
    isNumber: Function,
    setFormatedQty: Function,
    calcStockQty: Function,
    setFormatedCurrency: Function,
    calcPrices: Function,
    calcUom: Function,
    setSerialNo: Function,
    setBatchQty: Function,
    validateDueDate: Function,
    removeItem: Function,
    subtractOne: Function,
    addOne: Function,
    isReturnInvoice: Boolean,
    toggleOffer: Function,
  },
  computed: {
    headerProps() {
      return this.isDarkTheme
        ? { style: 'background-color:#121212;color:#fff' }
        : {};
    },
    isDarkTheme() {
      return this.$theme.current === 'dark';
    },
  },
};
</script>

<style>
/* Replace custom table styling with standardized pos-table class */
.enhanced-table-items {
  composes: pos-table;
  /* Any additional specific styling can remain */
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Simplify deep selectors using standardized variables */
.enhanced-table-items :deep(.v-data-table__wrapper),
.enhanced-table-items :deep(.v-table__wrapper) {
  border-radius: var(--border-radius-sm);
  height: 100%;
  overflow-y: auto;
}

/* Remove redundant styling that's covered by pos-table */
/* Remove all the redundant th styling */
/* Remove all the redundant dark theme overrides */

/* Keep only specific customizations not covered by pos-table */
.enhanced-table-items :deep(.v-data-table__expanded) {
  padding: var(--dynamic-md) var(--dynamic-lg);
  background-color: var(--surface-secondary);
}

.action-buttons-container {
  padding: 8px 4px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.dark-theme) .action-buttons-container,
:deep(.v-theme--dark) .action-buttons-container {
  background-color: rgba(255, 255, 255, 0.05);
}

.action-group {
  display: flex;
  align-items: center;
}

.item-action-btn {
  min-width: 44px !important;
  height: 44px !important;
  border-radius: 12px !important;
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1) !important;
  margin: 0 3px !important;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 0 16px !important;
}

.item-action-btn .action-label {
  margin-left: 8px;
  font-weight: 500;
  display: none;
}

@media (min-width: 600px) {
  .item-action-btn .action-label {
    display: inline-block;
  }
  
  .item-action-btn {
    min-width: 120px !important;
  }
}

.item-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.15) !important;
}

.item-action-btn .v-icon {
  font-size: 22px !important;
  position: relative;
  z-index: 2;
}

/* Light theme button styles */
.item-action-btn.delete-btn {
  background: linear-gradient(145deg, #ffebee, #ffcdd2) !important;
}

.item-action-btn.delete-btn:hover {
  background: linear-gradient(145deg, #ffcdd2, #ef9a9a) !important;
}

.item-action-btn.minus-btn {
  background: linear-gradient(145deg, #fff8e1, #ffecb3) !important;
}

.item-action-btn.minus-btn:hover {
  background: linear-gradient(145deg, #ffecb3, #ffe082) !important;
}

.item-action-btn.plus-btn {
  background: linear-gradient(145deg, #e8f5e9, #c8e6c9) !important;
}

.item-action-btn.plus-btn:hover {
  background: linear-gradient(145deg, #c8e6c9, #a5d6a7) !important;
}

/* Dark theme button styles */
:deep(.dark-theme) .item-action-btn.delete-btn,
:deep(.v-theme--dark) .item-action-btn.delete-btn {
  background: linear-gradient(145deg, #4a1515, #3a1010) !important;
  color: #ff8a80 !important;
}

:deep(.dark-theme) .item-action-btn.delete-btn:hover,
:deep(.v-theme--dark) .item-action-btn.delete-btn:hover {
  background: linear-gradient(145deg, #5a1a1a, #4a1515) !important;
}

:deep(.dark-theme) .item-action-btn.minus-btn,
:deep(.v-theme--dark) .item-action-btn.minus-btn {
  background: linear-gradient(145deg, #4a3c10, #3a2e0c) !important;
  color: #ffe082 !important;
}

:deep(.dark-theme) .item-action-btn.minus-btn:hover,
:deep(.v-theme--dark) .item-action-btn.minus-btn:hover {
  background: linear-gradient(145deg, #5a4a14, #4a3c10) !important;
}

:deep(.dark-theme) .item-action-btn.plus-btn,
:deep(.v-theme--dark) .item-action-btn.plus-btn {
  background: linear-gradient(145deg, #1b4620, #133419) !important;
  color: #a5d6a7 !important;
}

:deep(.dark-theme) .item-action-btn.plus-btn:hover,
:deep(.v-theme--dark) .item-action-btn.plus-btn:hover {
  background: linear-gradient(145deg, #235828, #1b4620) !important;
}

:deep(.dark-theme) .item-action-btn .v-icon,
:deep(.v-theme--dark) .item-action-btn .v-icon {
  opacity: 0.9;
}
</style>