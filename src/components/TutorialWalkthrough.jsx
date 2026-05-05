import { useState, useRef } from "react";

// First-login gameplay guide. Multi-page swipeable card — user taps NEXT
// or swipes left/right to flip through the gameplay basics, ending on the
// "Plant mutations" page that explains the six reactions friends can gift.
const PAGES = [
  {
    icon: "🌱",
    title: "Welcome to your garden",
    body: "Grow your vocabulary by planting words. Each plant is a word you've learned, and your garden grows as you do.",
  },
  {
    icon: "🌰",
    title: "Get a seed",
    body: "Tap NEW SEED to answer a quiz. Each correct answer earns a word seed to plant.",
  },
  {
    icon: "🪴",
    title: "Plant on grass",
    body: "Tap a green tile to plant. Grass only — water, paths, and trees are blocked. The grid snaps for you.",
  },
  {
    icon: "💧",
    title: "Water to grow",
    body: "Tap a plant, then WATER. Three correct quiz answers take it from seed → sprout → bloom.",
  },
  {
    icon: "🌸",
    title: "Harvest blooms",
    body: "Fully-grown plants can be harvested into your COLLECTION — your permanent vocabulary library.",
  },
  {
    icon: "🧬",
    title: "Breed in the LAB",
    body: "Combine two harvested words to create a new related word — sun + flower → sunflower. Each breed costs one daily seed.",
  },
  {
    icon: "👯",
    title: "Visit friends",
    body: "Tap the people icon to visit a friend's garden. Gift them a reaction or leave a one-time short note on each plant.",
  },
  {
    icon: "🔥",
    title: "Daily streak",
    body: "Open the app every day to keep your streak going. Daily check-ins build the habit and unlock harder words over time.",
  },
  {
    icon: "✨",
    title: "Plant mutations",
    body: "When a friend gifts your fully-grown plant a reaction, it permanently mutates with a unique visual flourish:",
    mutations: [
      { emoji: "🌸", name: "Cherry",  blurb: "Pink petals drift down" },
      { emoji: "💧", name: "Dewdrop", blurb: "Glassy droplets fall" },
      { emoji: "✨", name: "Sparkle", blurb: "Soft twinkles around" },
      { emoji: "🌟", name: "Star",    blurb: "Golden burst behind" },
      { emoji: "💕", name: "Heart",   blurb: "Pulsing pink aura" },
      { emoji: "🌈", name: "Rainbow", blurb: "Chromatic sweep" },
    ],
  },
];

const SWIPE_THRESHOLD = 60;

export function TutorialWalkthrough({ onComplete }) {
  const [page, setPage] = useState(0);
  const cur = PAGES[page];
  const isLast = page === PAGES.length - 1;
  const swipeRef = useRef({ startX: 0, dx: 0, active: false });

  const next = () => isLast ? onComplete?.() : setPage(p => p + 1);
  const prev = () => setPage(p => Math.max(0, p - 1));
  const goTo = (i) => setPage(i);

  // Touch/pointer swipe to flip pages.
  const onPointerDown = (e) => {
    swipeRef.current = { startX: e.clientX, dx: 0, active: true };
  };
  const onPointerMove = (e) => {
    if (!swipeRef.current.active) return;
    swipeRef.current.dx = e.clientX - swipeRef.current.startX;
  };
  const onPointerUp = () => {
    if (!swipeRef.current.active) return;
    const { dx } = swipeRef.current;
    swipeRef.current.active = false;
    if (dx <= -SWIPE_THRESHOLD) next();
    else if (dx >= SWIPE_THRESHOLD) prev();
  };

  return (
    <div className="guide-backdrop" onClick={e => e.stopPropagation()}>
      <div
        className="guide-card"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="guide-progress">
          {PAGES.map((_, i) => (
            <span
              key={i}
              className={`guide-dot${i === page ? " active" : ""}${i < page ? " done" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <div key={page} className="guide-page">
          <div className="guide-icon">{cur.icon}</div>
          <div className="guide-title">{cur.title}</div>
          <div className="guide-body">{cur.body}</div>

          {cur.mutations && (
            <div className="guide-mutation-grid">
              {cur.mutations.map(m => (
                <div className={`guide-mutation guide-mutation-${m.name.toLowerCase()}`} key={m.emoji}>
                  <div className="guide-mutation-emoji">{m.emoji}</div>
                  <div className="guide-mutation-meta">
                    <div className="guide-mutation-name">{m.name}</div>
                    <div className="guide-mutation-blurb">{m.blurb}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="guide-actions">
          <button className="guide-skip" onClick={onComplete}>SKIP</button>
          <button className="hd-btn yellow guide-next" onClick={next}>
            {isLast ? "GOT IT — LET'S GROW! 🌿" : "NEXT →"}
          </button>
        </div>

        <div className="guide-swipe-hint">← swipe →</div>
      </div>
    </div>
  );
}
