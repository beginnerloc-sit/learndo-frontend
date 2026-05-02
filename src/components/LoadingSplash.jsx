import { useEffect, useState } from "react";

const MESSAGES = [
  "Watering the seeds…",
  "Brewing garden tea…",
  "Calling the bees back home…",
  "Polishing the petals…",
  "Counting the morning leaves…",
  "Whispering to the roots…",
  "Untangling the vines…",
  "Fluffing up the soil…",
];

export function LoadingSplash({ fading = false }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={`splash${fading ? " splash-fading" : ""}`}>
      {/* Soft drifting cloud puffs in the sky band */}
      <div className="splash-cloud splash-cloud-1" />
      <div className="splash-cloud splash-cloud-2" />
      <div className="splash-cloud splash-cloud-3" />

      {/* Brand */}
      <div className="splash-brand">
        <div className="splash-logo">🌱</div>
        <div className="splash-name">Learndo</div>
      </div>

      {/* Hero — pot in a pulsing halo with a slow leaf drift */}
      <div className="splash-hero">
        <div className="splash-halo" />
        <div className="splash-halo splash-halo-2" />
        <div className="splash-pot">🪴</div>
        <div className="splash-leaf splash-leaf-1">🍃</div>
        <div className="splash-leaf splash-leaf-2">🍃</div>
      </div>

      {/* Cycling chill message */}
      <div className="splash-msg-wrap">
        <div className="splash-msg" key={idx}>{MESSAGES[idx]}</div>
      </div>

      {/* Tiny dot loader */}
      <div className="splash-dots"><span/><span/><span/></div>
    </div>
  );
}
