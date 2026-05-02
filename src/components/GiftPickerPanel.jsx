import React from "react";
import { ChevronLeft } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchCollection, giftSeed } from "../api/leaderboard";

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
const WORD_COLORS = ["#c1325a","#b53a6a","#d97a3e","#5a9333","#5a3e8e","#2176c7","#d4267a","#3aab4e","#e8671a","#0fa8c0"];
const WORD_FONTS  = ["'Caprasimo', serif","'Lilita One', sans-serif","'Shrikhand', serif","'Pacifico', cursive","'Caveat', cursive","'Bowlby One', sans-serif"];
const WORD_STYLES = ["normal","normal","normal","italic","bold","bold italic"];

function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return h;
}
function spriteFor(word) {
  return POT_SPRITES[strHash(word) % 100 % POT_SPRITES.length];
}
function wordStyle(word) {
  const wh = strHash(word);
  return {
    color:      WORD_COLORS[wh % WORD_COLORS.length],
    fontFamily: WORD_FONTS[(wh ^ 0xb1c2) % WORD_FONTS.length],
    fontStyle:  WORD_STYLES[(wh ^ 0xa3f1) % WORD_STYLES.length],
  };
}

export function GiftPickerPanel({ friend, onClose }) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [giftState, setGiftState] = React.useState({}); // word → "sending" | "sent" | "error:msg"

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
    queryKey: ["my-collection-gift", debouncedSearch],
    queryFn: ({ pageParam = 0 }) =>
      fetchCollection({ q: debouncedSearch, skip: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE
        ? allPages.reduce((n, p) => n + p.length, 0)
        : undefined,
    staleTime: 30 * 1000,
  });

  const items = data?.pages.flat() ?? [];

  async function handleGift(word) {
    if (giftState[word]) return;
    setGiftState(s => ({ ...s, [word]: "sending" }));
    try {
      await giftSeed(friend.id, word);
      setGiftState(s => ({ ...s, [word]: "sent" }));
    } catch (e) {
      const msg = e.message || "Failed";
      setGiftState(s => ({ ...s, [word]: `error:${msg}` }));
      setTimeout(() => setGiftState(s => { const n = { ...s }; delete n[word]; return n; }), 3000);
    }
  }

  const name = friend?.name ?? "Friend";

  return (
    <div className="gift-picker">
      <div className="gift-picker-header">
        <button className="icon-btn" style={{ flexShrink: 0 }} onClick={onClose}>
          <ChevronLeft size={15} strokeWidth={2.5} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="gift-picker-title">🎁 Gift to {name}</div>
          <div className="gift-picker-sub">
            {items.length} words{hasNextPage ? " · more" : ""}
          </div>
        </div>
        <input
          className="collection-search"
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 110, flexShrink: 0 }}
        />
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
          <p>HARVEST STAGE 5 PLANTS TO BUILD YOUR COLLECTION</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="collection-list">
          {items.map(item => {
            const ws = wordStyle(item.word);
            const state = giftState[item.word];
            const isSent    = state === "sent";
            const isSending = state === "sending";
            const isError   = state?.startsWith("error:");
            const errMsg    = isError ? state.slice(6) : null;

            return (
              <div key={item.id} className="harvest-card gift-picker-card">
                <div className="harvest-plant">
                  <img
                    className="harvest-sprite"
                    src={`/assets/garden/${spriteFor(item.word)}.png`}
                    alt={item.word}
                  />
                  <span
                    className="harvest-plant-word"
                    style={{ color: ws.color, fontFamily: ws.fontFamily, fontStyle: ws.fontStyle }}
                  >
                    {item.word}
                  </span>
                </div>
                <div className="harvest-info">
                  <span className="lang-tag" style={{ background: item.lang_color + "33", color: item.lang_color, borderColor: item.lang_color + "66" }}>
                    {item.lang.toUpperCase()}
                  </span>
                  {item.ipa  && <div className="harvest-ipa">/{item.ipa}/</div>}
                  {item.gloss && <div className="harvest-gloss">{item.gloss}</div>}
                  {isError && <div className="gift-picker-err">{errMsg}</div>}
                </div>
                <button
                  className={`gift-btn${isSent ? " sent" : isSending ? " sending" : ""}`}
                  onClick={() => handleGift(item.word)}
                  disabled={isSent || isSending}
                >
                  {isSent ? "✓" : isSending ? "…" : "🎁"}
                </button>
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
