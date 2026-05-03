import React from "react";
import { ChevronLeft, Search, Gift, Check } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchCollection, giftSeed } from "../api/leaderboard";
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
  return list[strHash(word) % 100 % list.length];
}

export function GiftPickerPanel({ friend, onClose }) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [giftState, setGiftState] = React.useState({}); // word → "sending" | "sent" | "error:msg"

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 280);
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
        <button className="icon-btn" onClick={onClose}>
          <ChevronLeft size={15} strokeWidth={2.5} />
        </button>
        <div className="sign" style={{ flex: 1, textAlign: "center" }}>
          <h1>🎁 Gift to {name}</h1>
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div className="gift-searchbar">
        <Search size={14} strokeWidth={2.5} className="gift-search-icon" />
        <input
          className="gift-search"
          type="text"
          placeholder="Search your collection…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="gift-sub-line">
        Pick a word from your collection · {items.length}{hasNextPage ? "+" : ""} harvested
      </div>

      <div className="gift-body">
        {isLoading && (
          <div className="collection-empty">
            <div className="big">⏳</div>
            <p>Loading…</p>
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="collection-empty">
            <div className="big">🌱</div>
            <p>{debouncedSearch ? "No words match." : "Harvest fully-grown plants to build your collection — then come back to gift!"}</p>
          </div>
        )}

        {!isLoading && items.length > 0 && items.map(item => {
          const theme   = wordTheme(item.word, item.lang);
          const state   = giftState[item.word];
          const isSent  = state === "sent";
          const isSending = state === "sending";
          const isError = state?.startsWith("error:");
          const errMsg  = isError ? state.slice(6) : null;

          return (
            <div key={item.id} className={`gift-row${isSent ? " gift-row-sent" : ""}`}>
              <div className="gift-row-plant">
                <img
                  className="gift-row-sprite"
                  src={`/assets/${spriteFor(item.word, item.level)}.png`}
                  alt={item.word}
                />
                <span
                  className="gift-row-word"
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
              </div>
              <div className="gift-row-info">
                <span
                  className="lang-tag"
                  style={{ background: item.lang_color + "33", color: item.lang_color, borderColor: item.lang_color + "66" }}
                >
                  {item.lang.toUpperCase()}
                </span>
                {item.gloss && <div className="gift-row-gloss">{item.gloss}</div>}
                {isError && <div className="gift-row-err">{errMsg}</div>}
              </div>
              <button
                className={`gift-row-btn${isSent ? " sent" : isSending ? " sending" : ""}`}
                onClick={() => handleGift(item.word)}
                disabled={isSent || isSending}
                title={isSent ? "Sent!" : "Send seed"}
              >
                {isSent ? <Check size={16} strokeWidth={2.8} /> : isSending ? "…" : <Gift size={15} strokeWidth={2.5} />}
              </button>
            </div>
          );
        })}

        {hasNextPage && !isLoading && items.length > 0 && (
          <button
            className="collection-load-more"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
