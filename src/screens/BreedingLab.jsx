import React, { useEffect, useRef, useState } from "react";
import { X, Search } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchCollection, crossbreedWords } from "../api/leaderboard";
import { wordTheme } from "../utils/wordTheme";

const PAGE_SIZE = 50;

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

function strHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h; }
function spriteFor(word, level) {
  const list = FLOWERS_TIER[level] || FLOWERS_TIER.beginner;
  return list[strHash(word) % 100 % list.length];
}

export function BreedingLab({ onClose, onPlantNewWord }) {
  const [slots, setSlots]   = useState([null, null]);
  const [drag, setDrag]     = useState(null);
  // phase: null | "mixing" (API in flight) | "revealing" (cards flying + flash)
  const [phase, setPhase]   = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const breeding = phase !== null;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);

  // Whenever a breeding phase begins or ends, clear any in-flight drag.
  // (Prevents stale drag state surviving across the cutscene → result modal.)
  useEffect(() => { if (phase) setDrag(null); }, [phase]);

  const slot0Ref = useRef(null);
  const slot1Ref = useRef(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["collection-lab"],
    queryFn:  ({ pageParam = 0 }) => fetchCollection({ skip: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (last, all) =>
      last.length === PAGE_SIZE ? all.reduce((n, p) => n + p.length, 0) : undefined,
    staleTime: 30_000,
  });
  const items = data?.pages.flat() ?? [];
  const slotIds = new Set(slots.filter(Boolean).map(s => s.id));
  const benchItems = items
    .filter(i => !slotIds.has(i.id))
    .filter(i => !debouncedSearch || i.word.toLowerCase().includes(debouncedSearch));

  // ── Drag handlers ─────────────────────────────────────────────────────
  const startDrag = (item) => (e) => {
    if (breeding || result || !e.isPrimary) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDrag({
      item,
      offX: e.clientX - rect.left,
      offY: e.clientY - rect.top,
      x: rect.left, y: rect.top,
      w: rect.width, h: rect.height,
      hoverSlot: null,
    });
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    e.preventDefault();
    const x = e.clientX - drag.offX;
    const y = e.clientY - drag.offY;
    let hover = null;
    const cx = e.clientX, cy = e.clientY;
    for (const [i, ref] of [[0, slot0Ref], [1, slot1Ref]]) {
      const r = ref.current?.getBoundingClientRect();
      if (r && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        hover = i; break;
      }
    }
    setDrag(d => d ? { ...d, x, y, hoverSlot: hover } : d);
  };

  const onPointerUp = () => {
    if (!drag) return;
    const { item, hoverSlot } = drag;
    if (hoverSlot !== null) {
      setSlots(prev => {
        const next = [...prev];
        // If this item was already in another slot, vacate it first
        for (let i = 0; i < 2; i++) if (next[i]?.id === item.id) next[i] = null;
        next[hoverSlot] = item;
        return next;
      });
    }
    setDrag(null);
  };

  const clearSlot = (i) => setSlots(prev => { const n = [...prev]; n[i] = null; return n; });
  const swapSlots = () => setSlots(prev => [prev[1], prev[0]]);

  const breed = async () => {
    if (!slots[0] || !slots[1] || phase) return;
    setError("");
    // Phase 1 — show the spinning hourglass while OpenAI is thinking
    setPhase("mixing");
    try {
      const r = await crossbreedWords(slots[0].word, slots[1].word);
      // Phase 2 — result is ready: play the cutscene (cards fly in + flash)
      setPhase("revealing");
      const REVEAL_MS = 2200;     // matches the CSS animation length
      await new Promise(res => setTimeout(res, REVEAL_MS));
      // Phase 3 — show the result modal
      setResult(r);
      setPhase(null);
    } catch (e) {
      setError(e.message || "Failed");
      setTimeout(() => setError(""), 5000);
      setPhase(null);
    }
  };

  const plantIt = () => {
    if (!result) return;
    onPlantNewWord?.({ word: result.word, lang: result.lang, langColor: result.lang_color });
    onClose?.();
  };

  const dismissResult = () => {
    // Quota was already consumed on the backend — make it clear
    setResult(null);
    setSlots([null, null]);
  };

  return (
    <div
      className="lab-screen"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="lab-header">
        <button className="icon-btn" onClick={onClose}><X size={15} strokeWidth={2.5} /></button>
        <div className="sign" style={{ flex: 1, textAlign: "center" }}>
          <h1>✨ Breeding Lab</h1>
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div className="lab-stage">
        <Slot ref={slot0Ref} index={0} item={slots[0]} hover={drag?.hoverSlot === 0} onClear={() => clearSlot(0)} />

        <div className="lab-middle">
          <button
            className={`breed-btn${breeding ? " busy" : ""}`}
            disabled={!slots[0] || !slots[1] || breeding}
            onClick={breed}
          >
            <span className="breed-emoji">{breeding ? "⏳" : "✨"}</span>
            <span className="breed-text">{breeding ? "MIXING…" : "BREED"}</span>
          </button>
          {slots[0] && slots[1] && !breeding && (
            <button className="lab-swap" onClick={swapSlots} title="Swap slots">⇄</button>
          )}
        </div>

        <Slot ref={slot1Ref} index={1} item={slots[1]} hover={drag?.hoverSlot === 1} onClear={() => clearSlot(1)} />
      </div>

      <div className="lab-bench-header">
        <div className="lab-bench-label">
          {drag ? "DROP INTO A SLOT" : "DRAG A PLANT INTO A SLOT"}
          <span className="lab-quota-note">⚠ each breed uses 1 daily seed quota</span>
        </div>
        <div className="lab-bench-search">
          <Search size={12} strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="lab-bench-search-clear" onClick={() => setSearch("")}>×</button>
          )}
        </div>
      </div>
      <div className="lab-bench">
        {isLoading && <div className="lab-bench-empty">Loading…</div>}
        {!isLoading && benchItems.length === 0 && (
          <div className="lab-bench-empty">
            {debouncedSearch
              ? <>🔍 No words match "<b>{debouncedSearch}</b>"</>
              : <>🌱 Harvest some plants first — your collection is empty.</>}
          </div>
        )}
        {benchItems.map(item => (
          <BenchCard
            key={item.id}
            item={item}
            beingDragged={drag?.item.id === item.id}
            onPointerDown={startDrag(item)}
          />
        ))}
        {hasNextPage && !debouncedSearch && (
          <button className="lab-bench-more" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "…" : "load more"}
          </button>
        )}
      </div>

      {drag && (
        <div
          className="lab-drag-ghost"
          style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }}
        >
          <BenchCard item={drag.item} ghost />
        </div>
      )}

      {error && <div className="lab-error">{error}</div>}

      {phase === "mixing" && slots[0] && slots[1] && (
        <div className="mixing-overlay">
          <div className="mix-hourglass">⏳</div>
          <div className="mix-label">MIXING…</div>
          <div className="mix-parents">
            <BenchCard item={slots[0]} />
            <span className="mix-plus">✨</span>
            <BenchCard item={slots[1]} />
          </div>
        </div>
      )}

      {phase === "revealing" && slots[0] && slots[1] && (
        <div className="cutscene">
          <CutsceneCard item={slots[0]} side="left" />
          <CutsceneCard item={slots[1]} side="right" />
          <div className="cs-flash" />
          <div className="cs-sparkles">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <span key={i} style={{ "--angle": `${i * 45}deg` }}>✨</span>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="modal-backdrop" onClick={dismissResult}>
          <div className="modal crossbreed-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="lang-pill" style={{ background: result.lang_color || "#5a3e1a" }}>
                {result.lang.toUpperCase()}
              </span>
              <button className="x-btn" onClick={dismissResult}>×</button>
            </div>
            <div className="cb-parents">
              <span>{slots[0]?.word}</span>
              <span className="cb-plus">+</span>
              <span>{slots[1]?.word}</span>
              <span className="cb-arrow">↓</span>
            </div>
            <div
              className="cb-result-word"
              style={(() => {
                const t = wordTheme(result.word, result.lang);
                return { fontFamily: t.fontFamily, color: t.color, fontStyle: t.fontStyle, fontWeight: t.fontWeight };
              })()}
            >
              {result.word}
            </div>
            {result.ipa && <div className="cb-ipa">{result.ipa}</div>}
            {result.gloss && <div className="cb-gloss">{result.gloss}</div>}
            {result.connection && <div className="cb-connection">💡 {result.connection}</div>}
            <div className="cb-actions">
              <button
                className="hd-btn"
                onClick={dismissResult}
                style={{ background: "linear-gradient(180deg,#e0e0e0,#aaa)", borderColor: "#555", color: "#fff" }}
              >
                DISCARD
              </button>
              <button className="hd-btn yellow" onClick={plantIt} style={{ flex: 1 }}>
                🌱 PLANT IT
              </button>
            </div>
            <div className="cb-quota-hint">Quota was used either way</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────
const Slot = React.forwardRef(({ index, item, hover, onClear }, ref) => {
  const theme = item ? wordTheme(item.word, item.lang) : null;
  return (
    <div ref={ref} className={`lab-slot${item ? " filled" : ""}${hover ? " hover" : ""}`}>
      {item ? (
        <>
          <button className="lab-slot-clear" onClick={onClear} title="Remove">×</button>
          <img
            className="lab-slot-img"
            src={`/assets/${spriteFor(item.word, item.level)}.png`}
            alt={item.word}
          />
          <div
            className="lab-slot-word"
            style={{ color: theme.color, fontFamily: theme.fontFamily, fontStyle: theme.fontStyle }}
          >
            {item.word}
          </div>
        </>
      ) : (
        <div className="lab-slot-empty">
          <div className="lab-slot-num">{index + 1}</div>
          <div className="lab-slot-hint">drop a plant here</div>
        </div>
      )}
    </div>
  );
});

function CutsceneCard({ item, side }) {
  const theme = wordTheme(item.word, item.lang);
  return (
    <div className={`cs-card cs-card-${side}`}>
      <img
        className="cs-card-img"
        src={`/assets/${spriteFor(item.word, item.level)}.png`}
        alt={item.word}
        draggable={false}
      />
      <div className="cs-card-word"
           style={{ color: theme.color, fontFamily: theme.fontFamily, fontStyle: theme.fontStyle }}>
        {item.word}
      </div>
    </div>
  );
}

function BenchCard({ item, beingDragged, ghost, ...rest }) {
  const theme = wordTheme(item.word, item.lang);
  return (
    <div
      className={`lab-bench-card${beingDragged ? " hidden" : ""}${ghost ? " ghost" : ""}`}
      {...rest}
    >
      <img
        className="lab-bench-img"
        src={`/assets/${spriteFor(item.word, item.level)}.png`}
        alt={item.word}
        draggable={false}
      />
      <div
        className="lab-bench-word"
        style={{ color: theme.color, fontFamily: theme.fontFamily, fontStyle: theme.fontStyle }}
      >
        {item.word}
      </div>
    </div>
  );
}
