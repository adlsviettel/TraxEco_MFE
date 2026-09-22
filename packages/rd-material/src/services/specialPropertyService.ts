export interface SpecialPropertyItem {
  id: string;
  name: string;
  iconUrl: string;
  isDefault?: boolean;
}

const STORAGE_KEY = 'traxeco_special_properties';

const getBaseUrl = () => {
  return (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';
};

export const DEFAULT_SPECIAL_PROPERTIES: SpecialPropertyItem[] = [
  {
    id: 'prop-water-repellent',
    name: 'Water Repellent',
    iconUrl: `${getBaseUrl()}sample-tag/water_repellency.png`,
    isDefault: true,
  },
  {
    id: 'prop-quick-dry',
    name: 'Quick Dry',
    iconUrl: `${getBaseUrl()}sample-tag/quick_dry.svg`,
    isDefault: true,
  },
  {
    id: 'prop-uv-protect',
    name: 'UV Protection',
    iconUrl: `${getBaseUrl()}sample-tag/uv_protection.svg`,
    isDefault: true,
  },
  {
    id: 'prop-anti-bacterial',
    name: 'Anti-Bacterial',
    iconUrl: `${getBaseUrl()}sample-tag/anti_bacterial.svg`,
    isDefault: true,
  },
  {
    id: 'prop-breathable',
    name: 'Breathable',
    iconUrl: `${getBaseUrl()}sample-tag/breathable.svg`,
    isDefault: true,
  },
  {
    id: 'prop-windproof',
    name: 'Windproof',
    iconUrl: `${getBaseUrl()}sample-tag/windproof.svg`,
    isDefault: true,
  },
];

let cachedProperties: SpecialPropertyItem[] | null = null;

export const specialPropertyService = {
  getAll: (): SpecialPropertyItem[] => {
    if (cachedProperties) {
      return cachedProperties;
    }

    const defaultMap = new Map(DEFAULT_SPECIAL_PROPERTIES.map(d => [d.id, d]));
    const defaultNameMap = new Map(DEFAULT_SPECIAL_PROPERTIES.map(d => [d.name.toLowerCase().trim(), d]));

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = parsed.map((p: SpecialPropertyItem) => {
            const def = defaultMap.get(p.id) || defaultNameMap.get((p.name || '').toLowerCase().trim());
            if (def) {
              return {
                ...p,
                id: def.id,
                name: def.name,
                isDefault: true,
                // Heal icon if missing or empty or old data URI
                iconUrl: (p.iconUrl && p.iconUrl.trim() !== '' && !p.iconUrl.startsWith('data:image/svg+xml;utf8'))
                  ? p.iconUrl
                  : def.iconUrl,
              };
            }
            return p;
          });

          const ids = new Set(merged.map((p: SpecialPropertyItem) => p.id));
          const missingDefaults = DEFAULT_SPECIAL_PROPERTIES.filter(d => !ids.has(d.id));
          cachedProperties = [...merged, ...missingDefaults];

          // Persist healed properties back to localStorage
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedProperties));
          } catch {
            // ignore
          }

          return cachedProperties;
        }
      }
    } catch {
      // ignore
    }
    cachedProperties = DEFAULT_SPECIAL_PROPERTIES;
    return cachedProperties;
  },

  saveAll: (items: SpecialPropertyItem[]): void => {
    cachedProperties = items;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save special properties to localStorage', e);
    }
    try {
      window.dispatchEvent(new CustomEvent('traxeco:special-properties-updated', { detail: items }));
    } catch {
      // ignore
    }
  },

  invalidateCache: (): void => {
    cachedProperties = null;
  },

  add: (item: Omit<SpecialPropertyItem, 'id'>): SpecialPropertyItem => {
    const current = specialPropertyService.getAll();
    const newItem: SpecialPropertyItem = {
      ...item,
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isDefault: false,
    };
    const updated = [newItem, ...current];
    specialPropertyService.saveAll(updated);
    return newItem;
  },

  update: (item: SpecialPropertyItem): void => {
    const current = specialPropertyService.getAll();
    const updated = current.map(p => (p.id === item.id ? { ...p, ...item } : p));
    specialPropertyService.saveAll(updated);
  },

  delete: (id: string): void => {
    const current = specialPropertyService.getAll();
    const updated = current.filter(p => p.id !== id);
    specialPropertyService.saveAll(updated);
  },
};
