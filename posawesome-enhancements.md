# POSAwesome Fast Counter Enhancements

Date: 2026-07-08

## Objective

Optimize POSAwesome for fast pharmacy counter sales on a local network while preserving server-confirmed invoice submission. Barcode items are supported as an exact-match path, but the design assumes most sales are item-code or name-search driven.

## Implemented Changes

- Added saved-drafts drawer keyboard control:
  - `Option+L` / `Alt+L` opens the saved invoice pane immediately.
  - Focus moves into the saved invoice list after records load.
  - `ArrowUp` / `ArrowDown` changes the selected invoice.
  - `Enter` opens the selected invoice and closes the right pane.
  - `Esc` closes the right pane without loading an invoice.
  - The pane now shows a loading state while drafts are fetched so opening feels immediate.
- Fixed operator offline refresh behavior:
  - `Refresh Offline Data` and `Rebuild Offline Data` now force a product catalog refresh.
  - The actions wait for the background product sync to settle before re-checking offline readiness.
  - Tax-inclusive settings and pricing rules are refreshed together so the `Pricing Offline` warning can clear after a successful online refresh.
- Added POS Profile settings:
  - `posa_fast_counter_mode`: enables the fast in-memory hot catalog.
  - `posa_hot_catalog_limit`: controls the hot catalog size, default `5000`, bounded to `100`-`10000`.
- Added `posawesome.posawesome.api.items.get_hot_items`.
  - Ranks items by recent submitted Sales Invoice activity.
  - Fills remaining slots with recently modified active sales items.
  - Uses the same enriched row shape as `get_items`.
- Added repair indexes for fast POS paths:
  - Item search and delta scope.
  - Item Price lookup.
  - Bin stock delta lookup.
  - Sales Invoice and Sales Invoice Item hot-catalog ranking.
  - Item Barcode exact lookup.
- Added frontend Fast Counter Mode:
  - Loads the hot catalog during POS initialization when enabled.
  - Searches hot items before IndexedDB or server fallback.
  - Returns exact item-code/barcode hits immediately.
  - Keeps IndexedDB and server fallback available for long-tail items.
  - Promotes newly scanned long-tail barcode items into the session hot catalog.
- Improved IndexedDB item search:
  - Added lowercase item code, item name, barcode, keyword, and combined search fields.
  - Bumped offline schema to version 16 in both the main Dexie module and item worker.
  - Ranked exact code/barcode results before prefix/name matches.
- Updated offline schema version marker to force cache reconciliation after deployment.

## Operating Model

Fast Counter Mode does not make invoice submission optimistic. Item lookup becomes local-first, but invoice submit still waits for the server so stock, pricing, tax, posting, and payment validation remain authoritative.

Search order with Fast Counter Mode enabled:

1. Exact hot barcode or item code.
2. Ranked hot catalog search.
3. IndexedDB full-catalog search when available.
4. Debounced server fallback for limit-search or local misses.

## Recommended Specs

Server for 5-10 active POS terminals:

- CPU: 8 modern cores or better.
- RAM: 32 GB minimum.
- Storage: NVMe SSD.
- Network: wired gigabit Ethernet, Cat6, server and POS terminals on the same switch.
- Docker: allocate enough RAM/CPU to MariaDB, Redis, Frappe web, workers, and scheduler; keep database storage on SSD/NVMe.

POS terminals:

- CPU: modern Intel i3/i5 or equivalent.
- RAM: 8 GB minimum.
- Storage: SSD.
- Browser: current Chrome/Chromium.
- Network: wired Ethernet preferred; Wi-Fi only as backup.

## Deployment Notes

1. Run migrations so the new POS Profile fields and indexes are created.
2. Enable `Fast Counter Mode` on the pharmacy POS Profile.
3. Start with `Hot Catalog Limit = 5000`.
4. Keep `Use Limit Search` off if the browser can hold the full catalog; keep it on for very low-spec terminals.
5. Clear/rebuild POS offline cache after deploying the frontend bundle because the IndexedDB schema changed.

## Build Status

Production frontend build has been run for the local POSAwesome assets. Docker build was not run.

## Verification

Completed in this working session:

- `node -e "JSON.parse(...custom_field.json...)"`
- `/Users/mac/anaconda3/bin/conda run -n frappe python -m unittest posawesome.posawesome.api.test_item_search_serialization posawesome.posawesome.api.test_api_imports posawesome.posawesome.api.test_offline_sync_delta_indexes_patch posawesome.posawesome.api.test_fast_pos_performance_indexes_patch`
- `yarn vitest run tests/itemService.spec.ts tests/itemsStoreLoadItems.spec.ts tests/useItemsSearchStore.spec.ts tests/offlineItemsCache.spec.ts`
- `yarn vitest run tests/parkedOrdersListKeyboard.spec.ts tests/invoiceSummaryDrafts.spec.ts tests/invoiceShortcuts.spec.ts`
- `yarn vitest run tests/offlineStatusPanel.spec.ts tests/navbarSettingsPanel.spec.ts tests/offlinePricingSyncAdapters.spec.ts tests/offlinePricingRepositories.spec.ts tests/itemsStoreLoadItems.spec.ts`
- `yarn type-check`
- `yarn lint`
- `yarn build`
- Runtime import check for Frappe query-builder functions and the modified POSAwesome item API modules.
- `git diff --check`

Not run:

- Bench build.
- Docker build.

## Work Record

This file is the durable record that we worked on the POSAwesome performance enhancement plan. There is no separate persistent assistant memory API available in this workspace, so the implementation notes are kept here in the app repository.

## 2026-07-09 Pricing Offline Warning Investigation

Issue observed on `retailmind.local`: POS showed `Connected to Server` but also `Pricing Offline`.

Findings:

- The MedPlus POS Profile is configured correctly:
  - Profile: `POS Awesome - MedPlus`
  - Company: `MedPlus Pharmacy`
  - Price List: `Standard Selling`
  - Currency: `PKR`
  - `posa_tax_inclusive`: `1`
- Backend checks passed:
  - `posawesome.posawesome.api.utilities.get_pos_profile_tax_inclusive`
  - `posawesome.posawesome.api.pricing_rules.get_active_pricing_rules`
  - `posawesome.posawesome.api.offline_sync.bootstrap.sync_bootstrap_config`
- Root cause found in frontend cache state:
  - The new offline sync path refreshed indexed `pricing_rule_records`.
  - The POS warning and pricing store still also depend on legacy `pricing_rules_snapshot` and `pricing_rules_context`.
  - If that legacy snapshot was missing or cleared during cache/build reconciliation, the UI kept reporting `Pricing Offline` even after the pricing-rules resource sync succeeded.

Fix:

- `syncPricingRulesResource` now hydrates `pricing_rules_snapshot` from the indexed pricing-rule repository after a successful sync.
- Full-resync-required pricing responses now explicitly mark pricing snapshot/context as missing.
- The warning tooltip now includes the exact missing prerequisite keys, for example `pricing_rules_snapshot`, `pricing_rules_context`, or `tax_inclusive`.

Verification:

- `yarn test:unit tests/offlinePricingSyncAdapters.spec.ts tests/bootstrapSnapshot.spec.ts tests/bootstrapWarningVisibility.spec.ts tests/offlineStatusPanel.spec.ts`
- `yarn type-check`
- `yarn lint`

## 2026-07-09 Discount % Column Visibility

Issue:

- In the Docker/release POS layout, enabling the `Discount %` invoice item column could appear to do nothing.

Findings:

- The POS Profile field `posa_display_discount_percentage` and the Columns drawer option were already present.
- The selected column was saved in browser preferences, but the responsive invoice table hid `discount_percentage`, `discount_amount`, `price_list_rate`, `uom`, and `posa_is_offer` whenever the cart table pane measured below 650px.
- That made the operator-selected `Discount %` column disappear in narrower release layouts even though the switch was enabled.

Fix:

- The invoice items table now keeps selected optional columns visible for normal POS pane widths.
- Optional columns only collapse on very narrow panes below 450px.
- The initial zero-width render no longer collapses optional columns before ResizeObserver reports the real table width.

Verification:

- `yarn vitest run tests/itemsTableResponsiveColumns.spec.ts`

## 2026-07-09 Online POS Product Warmup and Stock Warning

Issue:

- The POS item selector could briefly show `No items found` after a browser/cache reset while the catalog was being refetched.
- The navbar also showed `Stock Confidence Offline` with missing `stock_cache_ready` even though the server was online and visible products were being loaded from the server.

Findings:

- Backend product data was present: `get_items` returned items for `POS Awesome - MedPlus`, and the site had about 40k enabled sales items.
- Reproducing as `aqib@ai.ai` with the open MedPlus shift showed products loading correctly, then background sync filling IndexedDB in batches.
- The warning was caused by offline stock cache readiness: `stock_cache_ready` is only marked after the full background stock/catalog warmup completes. During online selling, this warning was noisy because live server-backed item rows already include stock quantities.

Fix:

- Bootstrap/offline-cache warnings are now hidden while the browser is online, the server is reachable, and manual offline mode is not active.
- Offline readiness state is still maintained and will surface when the POS is actually offline or manually forced offline.

Verification:

- `yarn vitest run tests/bootstrapWarningVisibility.spec.ts`
- `yarn type-check`
- Headless Chrome check with `aqib@ai.ai`: products rendered and `Stock Confidence Offline` was not visible while online.
