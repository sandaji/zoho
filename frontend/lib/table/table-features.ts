/**
 * Shared TanStack Table v9 features config.
 *
 * v9 is feature-based: you opt into behavior (sorting, filtering, pagination,
 * visibility, selection) by declaring it here. Every DataTable / migrated
 * table in the app imports this SAME object so:
 *   1. Column/Table/Row generics all agree on one `AppTableFeatures` type.
 *   2. We only pay the bundle cost for these features once.
 *   3. Any table can opt into pagination/sorting/etc. just by using the
 *      relevant table/column APIs - no per-table feature wiring needed.
 *
 * Individual tables are free to ignore features they don't use (e.g. a table
 * that never calls `setColumnVisibility` simply never touches that state).
 */
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

export const tableFeaturesConfig = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

// Pass this as the first generic argument to `ColumnDef`, `Column`, `ReactTable`,
// and `Row` so each type knows which feature APIs are available.
export type AppTableFeatures = typeof tableFeaturesConfig;
