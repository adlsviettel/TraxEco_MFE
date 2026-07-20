// Simple module-level store for column filter state sharing
// Uses window object with page keys to support keep-alive MFE environment

interface PageStoreType {
  columnFilters: Record<string, string[]>;
  setColumnFilters: ((updater: any) => void) | null;
  allRows: any[];
}

const WIN = window as any;
if (!WIN.__colFilterStores) {
  WIN.__colFilterStores = {} as Record<string, PageStoreType>;
}

const getOrCreateStore = (pageId: string): PageStoreType => {
  if (!WIN.__colFilterStores[pageId]) {
    WIN.__colFilterStores[pageId] = {
      columnFilters: {},
      setColumnFilters: null,
      allRows: [],
    };
  }
  return WIN.__colFilterStores[pageId];
};

export const columnFilterStore = {
  columnFilters(pageId: string): Record<string, string[]> {
    return getOrCreateStore(pageId).columnFilters;
  },

  allRows(pageId: string): any[] {
    return getOrCreateStore(pageId).allRows;
  },
  
  setColumnFilters(pageId: string, updater: any) {
    const store = getOrCreateStore(pageId);
    if (store.setColumnFilters) {
      store.setColumnFilters(updater);
    }
  },

  register(pageId: string, filters: Record<string, string[]>, setter: any, rows: any[]) {
    const store = getOrCreateStore(pageId);
    store.columnFilters = filters;
    store.setColumnFilters = setter;
    store.allRows = rows;
  }
};
