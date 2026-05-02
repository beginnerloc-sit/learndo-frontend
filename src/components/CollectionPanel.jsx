import React from "react";
import { X } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchCollection } from "../api/leaderboard";
import { wordTheme } from "../utils/wordTheme";

const PAGE_SIZE = 20;

const POT_SPRITES = [
  "pot1-red", "pot1-blue", "pot1-green",
  "pot2-colorful", "pot2-pink", "pot2-purple", "pot2-red", "pot2-yellow",
  "pot3-colorful", "pot3-purple", "pot3-red",
  "pot4-colorful", "pot4-yellow",
  "pot5-colorful", "pot5-lilac", "pot5-pink", "pot5-purple", "pot5-red",
  "pot6-colorful", "pot6-orange", "pot6-purple", "pot6-red",
  "pot7-colorful", "pot7-yellow",
];

function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function spriteFor(word) {
  const si = strHash(word) % 100;
  return POT_SPRITES[si % POT_SPRITES.length];
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CollectionPanel({ onClose }) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["collection", debouncedSearch],
    queryFn: ({ pageParam = 0 }) =>
      fetchCollection({ q: debouncedSearch, skip: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE
        ? allPages.reduce((n, p) => n + p.length, 0)
        : undefined,
    staleTime: 30 * 1000,
  });

  const items = data?.pages.flat() ?? [];

  return (
    <div className="collection-panel">
      <div className="collection-header">
        <div className="collection-title">
          <h2>My Collection</h2>
          <div className="sub">
            {items.length} {debouncedSearch ? "RESULTS" : "WORDS HARVESTED"}
            {hasNextPage ? " · MORE" : ""}
          </div>
        </div>
        <input
          className="collection-search"
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="collection-close" onClick={onClose}><X size={16} strokeWidth={2.5} /></button>
      </div>

      {isLoading && (
        <div className="collection-empty">
          <div className="big">⏳</div>
          <p>Loading…</p>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="collection-empty">
          <div className="big">🌱</div>
          <p>HARVEST STAGE 5 PLANTS TO COLLECT WORDS</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="collection-list">
          {items.map(item => {
            const theme = wordTheme(item.word);
            return (
              <div key={item.id} className="harvest-card">
                <div className="harvest-plant">
                  <img
                    className="harvest-sprite"
                    src={`/assets/garden/${spriteFor(item.word)}.png`}
                    alt={item.word}
                  />
                  <div className="harvest-plant-label">
                    <span
                      className="harvest-plant-word"
                      style={{ color: theme.color, fontFamily: theme.fontFamily, fontStyle: theme.fontStyle, fontWeight: theme.fontWeight, letterSpacing: theme.letterSpacing }}
                    >
                      {item.word}
                    </span>
                    {item.reactions?.[0] && (
                      <span className="harvest-compliment" title={`from ${item.reactions[0].from_name}`}>
                        {item.reactions[0].emoji}
                      </span>
                    )}
                  </div>
                </div>
                <div className="harvest-info">
                  <span className="lang-tag" style={{ background: item.lang_color + "33", color: item.lang_color, borderColor: item.lang_color + "66" }}>
                    {item.lang.toUpperCase()}
                  </span>
                  {item.ipa && <div className="harvest-ipa">/{item.ipa}/</div>}
                  {item.gloss && <div className="harvest-gloss">{item.gloss}</div>}
                  <div className="harvest-date">🌸 Harvested {fmtDate(item.harvested_at)}</div>
                </div>
              </div>
            );
          })}
          {hasNextPage && (
            <button
              className="collection-load-more"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
