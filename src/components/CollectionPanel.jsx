import React from "react";
import { X, Lock, Unlock } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCollection } from "../api/leaderboard";
import { updateCollectionLock } from "../api/users";
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

const REACT_CLASS = {
  "🌸": "react-cherry",
  "💧": "react-drop",
  "✨": "react-sparkle",
  "🌟": "react-star",
  "💕": "react-heart",
  "🌈": "react-rainbow",
};

function HarvestCard({ item }) {
  const [flipped, setFlipped] = React.useState(false);
  const theme = wordTheme(item.word);
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
        {/* Front — plant + word only */}
        <div className="harvest-face harvest-front">
          <img
            className="harvest-sprite"
            src={`/assets/garden/${spriteFor(item.word)}.png`}
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
            <span className="harvest-front-react" title={`from ${reaction.from_name}`}>
              {reaction.emoji}
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
          {item.ipa && <div className="harvest-ipa">/{item.ipa}/</div>}
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
    queryKey: ["collection", friendId ?? "me", debouncedSearch],
    queryFn: ({ pageParam = 0 }) =>
      fetchCollection({ q: debouncedSearch, skip: pageParam, limit: PAGE_SIZE, userId: friendId }),
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
        <input
          className="collection-search"
          type="text"
          placeholder="Search your harvested words…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
          <div className="big">🌱</div>
          <p>{isFriend ? `${friend.name} hasn't harvested anything yet.` : "HARVEST STAGE 5 PLANTS TO COLLECT WORDS"}</p>
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
