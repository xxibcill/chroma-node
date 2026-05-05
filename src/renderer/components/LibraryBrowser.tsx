import { useState, useEffect, useCallback, useMemo } from "react";
import type { LibraryItem, LibraryItemType } from "../../shared/library.js";
import type { CompatibilityResult } from "../../shared/compatibility.js";
import { checkLibraryItemCompatibility } from "../../shared/compatibility.js";

interface LibraryBrowserProps {
  items: LibraryItem[];
  onApply: (item: LibraryItem) => void;
  onInspect?: (item: LibraryItem) => void;
  onDelete?: (item: LibraryItem) => void;
  onDuplicate?: (item: LibraryItem) => void;
  onFavoriteToggle?: (item: LibraryItem) => void;
  currentColorProfile?: string;
  compact?: boolean;
}

type SortField = "name" | "createdAt" | "updatedAt";

const ITEM_TYPE_LABELS: Record<LibraryItemType, string> = {
  look: "Look",
  lut: "LUT",
  recipe: "Recipe",
  still: "Still",
  "sample-project": "Sample",
  "lesson-pack": "Lesson Pack"
};

export function LibraryBrowser({
  items,
  onApply,
  onInspect,
  onDelete,
  onDuplicate,
  onFavoriteToggle,
  currentColorProfile,
  compact = false
}: LibraryBrowserProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<LibraryItemType | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortAsc] = useState(false);
  const [showIncompatible, setShowIncompatible] = useState(true);

  const compatibilityMap = useMemo(() => {
    const map = new Map<string, CompatibilityResult>();
    for (const item of items) {
      map.set(item.id, checkLibraryItemCompatibility(item, undefined, currentColorProfile));
    }
    return map;
  }, [items, currentColorProfile]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter(item => item.type === typeFilter);
    }

    // Favorites filter
    if (favoritesOnly) {
      result = result.filter(item => item.favorite);
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Compatibility filter
    if (!showIncompatible) {
      result = result.filter(item => {
        const compat = compatibilityMap.get(item.id);
        return compat?.canApply ?? true;
      });
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          cmp = a.createdAt - b.createdAt;
          break;
        case "updatedAt":
          cmp = a.updatedAt - b.updatedAt;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [items, typeFilter, favoritesOnly, search, sortField, sortAsc, showIncompatible, compatibilityMap]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const item of items) {
      for (const tag of item.tags) tagSet.add(tag);
    }
    return Array.from(tagSet).sort();
  }, [items]);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const displayedItems = selectedTag
    ? filteredItems.filter(item => item.tags.includes(selectedTag))
    : filteredItems;

  if (compact) {
    return (
      <CompactLibraryBrowser
        items={displayedItems}
        compatibilityMap={compatibilityMap}
        onApply={onApply}
        onFavoriteToggle={onFavoriteToggle}
      />
    );
  }

  return (
    <div className="library-browser">
      <div className="library-browser__toolbar">
        <input
          type="text"
          className="library-browser__search"
          placeholder="Search library..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="library-browser__filters">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as LibraryItemType | "all")}
            className="library-browser__select"
          >
            <option value="all">All Types</option>
            {(Object.keys(ITEM_TYPE_LABELS) as LibraryItemType[]).map(type => (
              <option key={type} value={type}>{ITEM_TYPE_LABELS[type]}</option>
            ))}
          </select>

          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as SortField)}
            className="library-browser__select"
          >
            <option value="updatedAt">Recently Updated</option>
            <option value="createdAt">Recently Created</option>
            <option value="name">Name</option>
          </select>

          <label className="library-browser__checkbox">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={e => setFavoritesOnly(e.target.checked)}
            />
            Favorites
          </label>

          <label className="library-browser__checkbox">
            <input
              type="checkbox"
              checked={showIncompatible}
              onChange={e => setShowIncompatible(e.target.checked)}
            />
            Show All
          </label>
        </div>

        {allTags.length > 0 && (
          <div className="library-browser__tags">
            {allTags.slice(0, 10).map(tag => (
              <button
                key={tag}
                className={`library-browser__tag ${selectedTag === tag ? "library-browser__tag--active" : ""}`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="library-browser__grid">
        {displayedItems.length === 0 ? (
          <div className="library-browser__empty">
            {items.length === 0 ? "Library is empty" : "No items match your filters"}
          </div>
        ) : (
          displayedItems.map(item => (
            <LibraryItemCard
              key={item.id}
              item={item}
              compatibility={compatibilityMap.get(item.id)}
              onApply={() => onApply(item)}
              onInspect={onInspect ? () => onInspect(item) : undefined}
              onDelete={onDelete ? () => onDelete(item) : undefined}
              onDuplicate={onDuplicate ? () => onDuplicate(item) : undefined}
              onFavoriteToggle={onFavoriteToggle ? () => onFavoriteToggle(item) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface LibraryItemCardProps {
  item: LibraryItem;
  compatibility?: CompatibilityResult;
  onApply: () => void;
  onInspect?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onFavoriteToggle?: () => void;
}

function LibraryItemCard({
  item,
  compatibility,
  onApply,
  onInspect,
  onDelete,
  onDuplicate,
  onFavoriteToggle
}: LibraryItemCardProps) {
  const canApply = compatibility?.canApply ?? true;
  const hasWarnings = compatibility?.requiresWarning ?? false;

  return (
    <div
      className={`library-item-card ${!canApply ? "library-item-card--incompatible" : ""}`}
      data-trust={item.trust}
    >
      <div className="library-item-card__thumbnail">
        {item.thumbnail?.dataUrl ? (
          <img src={item.thumbnail.dataUrl} alt={item.name} />
        ) : (
          <div className="library-item-card__placeholder">
            {ITEM_TYPE_LABELS[item.type][0]}
          </div>
        )}
        {item.favorite && <span className="library-item-card__favorite">★</span>}
      </div>

      <div className="library-item-card__info">
        <div className="library-item-card__header">
          <span className="library-item-card__name">{item.name}</span>
          <span className={`library-item-card__trust library-item-card__trust--${item.trust}`}>
            {item.trust === "first-party" ? "1st" : item.trust === "verified-creator" ? "✓" : "L"}
          </span>
        </div>

        <div className="library-item-card__meta">
          <span className="library-item-card__type">{ITEM_TYPE_LABELS[item.type]}</span>
          {item.tags.slice(0, 2).map(tag => (
            <span key={tag} className="library-item-card__tag">{tag}</span>
          ))}
        </div>

        {hasWarnings && compatibility?.issues && (
          <div className="library-item-card__warnings">
            {compatibility.issues
              .filter(i => i.severity === "warning")
              .map((issue, idx) => (
                <span key={idx} className="library-item-card__warning" title={issue.message}>
                  ⚠
                </span>
              ))}
          </div>
        )}
      </div>

      <div className="library-item-card__actions">
        <button
          className="library-item-card__btn library-item-card__btn--apply"
          onClick={onApply}
          disabled={!canApply}
          title={!canApply ? compatibility?.issues[0]?.message : "Apply"}
        >
          Apply
        </button>
        {onInspect && (
          <button className="library-item-card__btn" onClick={onInspect} title="Inspect">
            ℹ
          </button>
        )}
        {onFavoriteToggle && (
          <button
            className="library-item-card__btn"
            onClick={onFavoriteToggle}
            title={item.favorite ? "Remove from favorites" : "Add to favorites"}
          >
            {item.favorite ? "★" : "☆"}
          </button>
        )}
        {onDuplicate && (
          <button className="library-item-card__btn" onClick={onDuplicate} title="Duplicate">
            ⧉
          </button>
        )}
        {onDelete && (
          <button className="library-item-card__btn library-item-card__btn--danger" onClick={onDelete} title="Delete">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

interface CompactLibraryBrowserProps {
  items: LibraryItem[];
  compatibilityMap: Map<string, CompatibilityResult>;
  onApply: (item: LibraryItem) => void;
  onFavoriteToggle?: (item: LibraryItem) => void;
}

function CompactLibraryBrowser({ items, compatibilityMap, onApply, onFavoriteToggle }: CompactLibraryBrowserProps) {
  if (items.length === 0) {
    return <div className="library-browser--empty">No items</div>;
  }

  return (
    <div className="library-browser library-browser--compact">
      {items.map(item => {
        const compat = compatibilityMap.get(item.id);
        const canApply = compat?.canApply ?? true;

        return (
          <div
            key={item.id}
            className={`library-browser__compact-item ${!canApply ? "library-browser__compact-item--disabled" : ""}`}
            onClick={() => canApply && onApply(item)}
            title={!canApply ? compat?.issues[0]?.message : item.name}
          >
            {item.thumbnail?.dataUrl ? (
              <img src={item.thumbnail.dataUrl} alt={item.name} className="library-browser__compact-thumb" />
            ) : (
              <div className="library-browser__compact-placeholder">
                {ITEM_TYPE_LABELS[item.type][0]}
              </div>
            )}
            <span className="library-browser__compact-name">{item.name}</span>
            {item.favorite && <span className="library-browser__compact-favorite">★</span>}
            {onFavoriteToggle && (
              <button
                className="library-browser__compact-fav-btn"
                onClick={e => {
                  e.stopPropagation();
                  onFavoriteToggle(item);
                }}
              >
                {item.favorite ? "★" : "☆"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function useLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.chromaNode?.loadLibrary();
      if (response?.result.ok && response.result.value) {
        setItems(response.result.value);
      } else {
        setError("Failed to load library");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = useCallback(async (request: Parameters<NonNullable<typeof window.chromaNode>["addLibraryItem"]>[0]) => {
    const response = await window.chromaNode?.addLibraryItem(request);
    if (response?.result.ok && response.result.value) {
      const newItem = response.result.value;
      setItems(prev => [...prev, newItem]);
      return newItem;
    }
    const err = response?.result;
    const errorMsg = err && !err.ok && err.error ? err.error.message : "Failed to add item";
    throw new Error(errorMsg);
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<LibraryItem>) => {
    const response = await window.chromaNode?.updateLibraryItem({ id, updates });
    if (response?.result.ok && response.result.value) {
      const updatedItem = response.result.value;
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
      return updatedItem;
    }
    const err = response?.result;
    const errorMsg = err && !err.ok && err.error ? err.error.message : "Failed to update item";
    throw new Error(errorMsg);
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const response = await window.chromaNode?.deleteLibraryItem({ id });
    if (response?.result.ok) {
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    }
    const err = response?.result;
    const errorMsg = err && !err.ok && err.error ? err.error.message : "Failed to delete item";
    throw new Error(errorMsg);
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const response = await window.chromaNode?.toggleLibraryItemFavorite({ id });
    if (response?.result.ok && response.result.value) {
      const updatedItem = response.result.value;
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
      return updatedItem;
    }
    const err = response?.result;
    const errorMsg = err && !err.ok && err.error ? err.error.message : "Failed to toggle favorite";
    throw new Error(errorMsg);
  }, []);

  return {
    items,
    loading,
    error,
    reload: load,
    addItem,
    updateItem,
    deleteItem,
    toggleFavorite
  };
}