import { useState } from "react";
import { WordPlant } from "./WordPlant";
import "./GardenPlot.css";

const PLOTS = [
  { id: 0, x: -260, y: -40,  w: 120, d: 90, tag: "¡Español!", tagColor: "#c1325a" },
  { id: 1, x:   60, y: -60,  w: 130, d: 95, tag: "日本語",    tagColor: "#b53a6a" },
  { id: 2, x: -300, y: 200,  w: 110, d: 85, tag: "Deutsch",   tagColor: "#5a3e8e" },
  { id: 3, x:  -40, y: 230,  w: 130, d: 95, tag: "Français",  tagColor: "#5a3e8e" },
];

function iso(x, y) {
  const k = 0.85;
  return { x: (x - y) * 0.866 * k, y: (x + y) * 0.5 * k };
}

function PlotBed({ plot, plants }) {
  const A = iso(0, 0), C = iso(plot.w, plot.d);
  const B = iso(plot.w, 0), D = iso(0, plot.d);
  const cx = (A.x + C.x) / 2;
  const cy = (A.y + C.y) / 2;
  const rx = (B.x - D.x) / 2;
  const ry = (C.y - A.y) / 2;
  const soilRx = rx + 4, soilRy = ry + 3;

  const seed = Math.abs(Math.round(plot.x * 13 + plot.y * 7));
  const rnd  = (n) => { const v = Math.sin(seed + n * 9.13) * 10000; return v - Math.floor(v); };
  const stones = Array.from({ length: 9 }).map((_, i) => {
    const a = (i / 9) * Math.PI * 2 + rnd(i) * 0.3;
    return { px: Math.cos(a) * (soilRx + 1), py: Math.sin(a) * (soilRy + 1), sw: 5 + rnd(i + 20) * 4, sh: 3 + rnd(i + 40) * 2 };
  });

  return (
    <g transform={`translate(${plot.x + cx} ${plot.y + cy})`}>
      <ellipse cx="0" cy={ry + 4} rx={soilRx + 18} ry={ry + 8} fill="rgba(20,30,10,0.18)" />
      <ellipse cx="0" cy="0" rx={soilRx} ry={soilRy} fill="#3e2410" />
      <ellipse cx="0" cy="1" rx={soilRx - 1} ry={soilRy - 1} fill="#6b401e" />

      {stones.filter(s => s.py < 0).map((s, i) => (
        <g key={`sb${i}`} transform={`translate(${s.px} ${s.py})`}>
          <ellipse cx="0" cy="0" rx={s.sw} ry={s.sh} fill="#a89274" stroke="#5a3e1a" strokeWidth="0.8" />
        </g>
      ))}

      {plants.map((p, i) => {
        const local = iso(p.x, p.y);
        return (
          <WordPlant
            key={p.id ?? i}
            x={local.x - cx}
            y={local.y - cy}
            word={p.word}
            scale={p.scale || 1}
            tilt={p.tilt || 0}
            stage={p.stage ?? 5}
          />
        );
      })}

      {stones.filter(s => s.py >= 0).map((s, i) => (
        <g key={`sf${i}`} transform={`translate(${s.px} ${s.py})`}>
          <ellipse cx="0" cy="0" rx={s.sw} ry={s.sh} fill="#a89274" stroke="#5a3e1a" strokeWidth="0.8" />
        </g>
      ))}

      {/* plot label */}
      <text
        x="0" y={-soilRy - 10}
        textAnchor="middle"
        fontFamily="'Lilita One', sans-serif"
        fontSize="11"
        fontWeight="400"
        fill={plot.tagColor}
        stroke="#fffbe9"
        strokeWidth="3"
        paintOrder="stroke"
      >
        {plot.tag}
      </text>
    </g>
  );
}

export function GardenPlot({ plants = [], ownerName, onPlantClick }) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);

  const byPlot = PLOTS.map((p) => ({
    plot: p,
    plants: plants.filter((v) => v.plotId === p.id),
  }));

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startX: e.clientX - pan.x, startY: e.clientY - pan.y });
  }
  function onPointerMove(e) {
    if (!drag) return;
    setPan({ x: e.clientX - drag.startX, y: e.clientY - drag.startY });
  }
  function onPointerUp() { setDrag(null); }

  return (
    <div className="garden-plot-wrap">
      {/* sky-to-grass background */}
      <div className="garden-scene-bg" />
      <div style={{ position: "absolute", top: 24, right: 40, width: 72, height: 72, borderRadius: 999, background: "radial-gradient(circle, #f7d36a 0%, #f3c14a 70%)", boxShadow: "0 0 60px rgba(243,193,74,0.45)", pointerEvents: "none" }} />

      {ownerName && (
        <div style={{ position: "absolute", top: 20, left: 20, zIndex: 4, background: "rgba(255,255,255,0.9)", borderRadius: 999, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--moss-800)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--moss-500)", display: "inline-block" }} />
          {ownerName}'s garden
        </div>
      )}

      <div
        className={`garden-world${drag ? " dragging" : ""}`}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <svg
          viewBox="-450 -120 900 900"
          width="900"
          height="900"
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <radialGradient id="soil-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7a5530" />
              <stop offset="100%" stopColor="#3e2410" />
            </radialGradient>
          </defs>

          {/* grass layer */}
          <rect x="-450" y="-120" width="900" height="900" fill="#8db867" />
          <rect x="-450" y="-120" width="900" height="450" fill="url(#sky-grad)" opacity="0.25" />

          {byPlot.map(({ plot, plants: p }) => (
            <PlotBed key={plot.id} plot={plot} plants={p} />
          ))}
        </svg>
      </div>
    </div>
  );
}
