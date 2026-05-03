import React from "react";
import { X, Lock, Unlock, SlidersHorizontal } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCollection } from "../api/leaderboard";
import { updateCollectionLock } from "../api/users";
import { wordTheme } from "../utils/wordTheme";

const PAGE_SIZE = 20;

const FLOWERS_TIER = {
  beginner: [
    "flowers1/pot1-red",      "flowers1/pot1-blue",     "flowers1/pot1-green",
    "flowers1/pot2-colorful", "flowers1/pot2-pink",     "flowers1/pot2-purple", "flowers1/pot2-red", "flowers1/pot2-yellow",
    "flowers1/pot3-colorful", "flowers1/pot3-purple",   "flowers1/pot3-red",
    "flowers1/pot4-colorful", "flowers1/pot4-yellow",
    "flowers1/pot5-colorful", "flowers1/pot5-lilac",    "flowers1/pot5-pink",   "flowers1/pot5-purple", "flowers1/pot5-red",
    "flowers1/pot6-colorful", "flowers1/pot6-orange",   "flowers1/pot6-purple", "flowers1/pot6-red",
    "flowers1/pot7-colorful", "flowers1/pot7-yellow",
  ],
  intermediate: [
    "flowers2/Pink_Flower_1",   "flowers2/Pink_Flower_2",   "flowers2/Pink_Flower_3",
    "flowers2/Purple_Flower_1", "flowers2/Purple_Flower_2", "flowers2/Purple_Flower_3",
    "flowers2/Red_Flower_1",    "flowers2/Red_Flower_2",    "flowers2/Red_Flower_3",    "flowers2/Red_Flower_4",
    "flowers2/Red_Rose_1",      "flowers2/Red_Rose_2",      "flowers2/Red_Rose_3",      "flowers2/Red_Rose_4",      "flowers2/Red_Rose_5",
    "flowers2/Yellow_Flower_1", "flowers2/Yellow_Flower_2", "flowers2/Yellow_Flower_3", "flowers2/Yellow_Flower_4",
  ],
  advanced: [
    "flowers3/Flower1",         "flowers3/Flower2",
    "flowers3/Premium1",        "flowers3/Premium2",        "flowers3/Premium3",
    "flowers3/Premium4",        "flowers3/Premium5",        "flowers3/Premium6",
    "flowers3/Pink_Flower_3",   "flowers3/Purple_Flower_3", "flowers3/Red_Flower_4",
    "flowers3/Red_Rose_5",      "flowers3/Yellow_Flower_4",
  ],
};

function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function spriteFor(word, level) {
  const list = FLOWERS_TIER[level] || FLOWERS_TIER.beginner;
  const si = strHash(word) % 100;
  return list[si % list.length];
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const REACT_CLASS = {
  "🌸": "react-cherry",
  "💧": "react-drop",
  "✨": "react-sparkle",
  "🌟": "react-star",
  "💕": "react-heart",
  "🌈": "react-rainbow",
};

const LANG_FILTERS = [
  { name: "English",    color: "#5a9eb8" },
  { name: "Spanish",    color: "#c1325a" },
  { name: "Japanese",   color: "#b53a6a" },
  { name: "Chinese",    color: "#d97a3e" },
  { name: "French",     color: "#d4812a" },
  { name: "German",     color: "#5a3e8e" },
  { name: "Italian",    color: "#3e6534" },
  { name: "Vietnamese", color: "#d4267a" },
];

const REACTION_FILTERS = ["🌸", "💧", "✨", "🌟", "💕", "🌈"];

function HarvestCard({ item }) {
  const [flipped, setFlipped] = React.useState(false);
  const theme = wordTheme(item.word, item.lang);
  const reaction = item.reactions?.[0];
  const reactClass = reaction ? (REACT_CLASS[reaction.emoji] || "") : "";
  return (
    <button
      className={[
        "harvest-card",
        flipped ? "flipped" : "",
        reaction ? "has-reaction" : "",
        reactClass,
      ].filter(Boolean).join(" ")}
      onClick={() => setFlipped(f => !f)}
      type="button"
    >
      <div className="harvest-card-inner">
        {/* Front — plant, word, and (if any) compliment giver */}
        <div className="harvest-face harvest-front">
          <img
            className="harvest-sprite"
            src={`/assets/${spriteFor(item.word, item.level)}.png`}
            alt={item.word}
          />
          <span
            className="harvest-front-word"
            style={{
              color: theme.color,
              fontFamily: theme.fontFamily,
              fontStyle: theme.fontStyle,
              fontWeight: theme.fontWeight,
              letterSpacing: theme.letterSpacing,
            }}
          >
            {item.word}
          </span>
          {reaction && (
            <span className="harvest-front-from" title={`Compliment from ${reaction.from_name}`}>
              <span className="harvest-front-from-emoji">{reaction.emoji}</span>
              <span className="harvest-front-from-name">from {reaction.from_name}</span>
            </span>
          )}
        </div>

        {/* Back — full info */}
        <div className="harvest-face harvest-back">
          <span
            className="lang-tag"
            style={{
              background: item.lang_color + "33",
              color: item.lang_color,
              borderColor: item.lang_color + "66",
            }}
          >
            {item.lang.toUpperCase()}
          </span>
          <div className="harvest-back-word">{item.word}</div>
          {item.ipa && <div className="harvest-ipa">{item.ipa}</div>}
          {item.gloss && <div className="harvest-gloss">{item.gloss}</div>}
          <div className="harvest-date">🌸 {fmtDate(item.harvested_at)}</div>
        </div>
      </div>
    </button>
  );
}

export function CollectionPanel({ onClose, friend = null, currentUser = null, onLockChange }) {
  const isFriend = !!friend;
  const friendId = friend?.id ?? null;
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [langFilter, setLangFilter] = React.useState("");
  const [reactionFilter, setReactionFilter] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [locked, setLocked] = React.useState(currentUser?.collection_locked ?? currentUser?.collectionLocked ?? false);
  const [lockBusy, setLockBusy] = React.useState(false);
  const qc = useQueryClient();

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
    error,
  } = useInfiniteQuery({
    queryKey: ["collection", friendId ?? "me", debouncedSearch, langFilter, reactionFilter],
    queryFn: ({ pageParam = 0 }) =>
      fetchCollection({ q: debouncedSearch, skip: pageParam, limit: PAGE_SIZE, userId: friendId, lang: langFilter, reaction: reactionFilter }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE
        ? allPages.reduce((n, p) => n + p.length, 0)
        : undefined,
    staleTime: 30 * 1000,
    retry: false,
  });

  const isLocked = error?.message === "LOCKED";
  const items = data?.pages.flat() ?? [];

  const toggleLock = async () => {
    if (lockBusy) return;
    setLockBusy(true);
    try {
      const updated = await updateCollectionLock(!locked);
      setLocked(updated.collectionLocked);
      onLockChange?.(updated.collectionLocked);
      qc.invalidateQueries({ queryKey: ["currentUser"] });
    } catch {
      // ignore
    } finally {
      setLockBusy(false);
    }
  };


  const title = isFriend ? `${friend.name}'s Collection` : "My Collection";

  return (
    <div className="collection-panel">
      <div className="collection-header">
        <div className="collection-title">
          <h2>{title}</h2>
          <div className="sub">
            {isLocked ? "PRIVATE" : `${items.length} ${debouncedSearch ? "RESULTS" : "WORDS HARVESTED"}`}
            {!isLocked && hasNextPage ? " · MORE" : ""}
          </div>
        </div>
        {!isFriend && (
          <button
            className={`collection-lock-btn${locked ? " locked" : ""}`}
            onClick={toggleLock}
            disabled={lockBusy}
            title={locked ? "Collection is private — tap to make public" : "Collection is public — tap to make private"}
          >
            {locked ? <Lock size={15} strokeWidth={2.5} /> : <Unlock size={15} strokeWidth={2.5} />}
          </button>
        )}
        <button className="collection-close" onClick={onClose}><X size={16} strokeWidth={2.5} /></button>
      </div>

      {!isLocked && (
        <div className="collection-searchbar">
          <input
            className="collection-search"
            type="text"
            placeholder="Search your harvested words…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            className={`collection-filter-toggle${filtersOpen ? " open" : ""}${(langFilter || reactionFilter) ? " has-active" : ""}`}
            onClick={() => setFiltersOpen(v => !v)}
            title="Filter"
          >
            <SlidersHorizontal size={14} strokeWidth={2.5} />
            {(!!langFilter + !!reactionFilter) > 0 && (
              <span className="filter-badge">{!!langFilter + !!reactionFilter}</span>
            )}
          </button>
        </div>
      )}

      {!isLocked && filtersOpen && (
        <div className="collection-filters">
          <div className="filter-row">
            <button
              className={`filter-pill${!langFilter ? " active" : ""}`}
              onClick={() => setLangFilter("")}
            >ALL</button>
            {LANG_FILTERS.map(l => (
              <button
                key={l.name}
                className={`filter-pill${langFilter === l.name ? " active" : ""}`}
                style={langFilter === l.name ? { background: l.color, borderColor: l.color, color: "#fff" } : { color: l.color, borderColor: l.color + "88" }}
                onClick={() => setLangFilter(langFilter === l.name ? "" : l.name)}
              >{l.name.slice(0, 3).toUpperCase()}</button>
            ))}
          </div>
          <div className="filter-row">
            <button
              className={`filter-pill${!reactionFilter ? " active" : ""}`}
              onClick={() => setReactionFilter("")}
            >ALL</button>
            {REACTION_FILTERS.map(emoji => (
              <button
                key={emoji}
                className={`filter-pill emoji${reactionFilter === emoji ? " active" : ""}`}
                onClick={() => setReactionFilter(reactionFilter === emoji ? "" : emoji)}
              >{emoji}</button>
            ))}
          </div>
        </div>
      )}

      {isLocked && (
        <div className="collection-empty">
          <div className="big">🔒</div>
          <p>{friend?.name ?? "This user"} keeps their collection private.</p>
        </div>
      )}

      {!isLocked && isLoading && (
        <div className="collection-empty">
          <div className="big">⏳</div>
          <p>Loading…</p>
        </div>
      )}

      {!isLocked && !isLoading && items.length === 0 && (
        <div className="collection-empty">
          <div className="big">{(langFilter || reactionFilter || debouncedSearch) ? "🔍" : "🌱"}</div>
          <p>
            {(langFilter || reactionFilter || debouncedSearch)
              ? "No words match these filters."
              : (isFriend ? `${friend.name} hasn't harvested anything yet.` : "HARVEST STAGE 5 PLANTS TO COLLECT WORDS")}
          </p>
        </div>
      )}

      {!isLocked && !isLoading && items.length > 0 && (
        <>
          <div className="collection-grid">
            {items.map(item => (
              <HarvestCard key={item.id} item={item} />
            ))}
          </div>
          {hasNextPage && (
            <button
              className="collection-load-more"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}

    </div>
  );
}
