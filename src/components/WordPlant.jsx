import { useMemo } from "react";

const FONT_POOL    = ["'Caprasimo', serif","'Shrikhand', serif","'Lilita One', sans-serif","'Pacifico', cursive","'Caveat', cursive","'Bowlby One', sans-serif"];
const PALETTE_POOL = [
  { a: "#ff6b8b", b: "#c1325a", stroke: "#5a0f24", fill: "#fffbe9" },
  { a: "#ffb3c4", b: "#b53a6a", stroke: "#3a0e22", fill: "#fffbe9" },
  { a: "#ffd96a", b: "#e8a91a", stroke: "#6e4e0e", fill: "#fff8d8" },
  { a: "#9ed6f0", b: "#5a9eb8", stroke: "#1f4658", fill: "#fffbe9" },
  { a: "#e6dfff", b: "#a48cc8", stroke: "#3d2a5a", fill: "#fffbe9" },
  { a: "#c8e6a8", b: "#5a9333", stroke: "#1c2c19", fill: "#fffbe9" },
  { a: "#ffd0a8", b: "#d97a3e", stroke: "#5a2e0e", fill: "#fffbe9" },
  { a: "#d0f0d8", b: "#3e8a5a", stroke: "#1c3a24", fill: "#fffbe9" },
  { a: "#ffc0d8", b: "#d63a8a", stroke: "#4a0e2a", fill: "#fffbe9" },
  { a: "#a0e0d8", b: "#3e8a8a", stroke: "#1c3a3a", fill: "#fffbe9" },
];
const LEAF_POOL   = ["thin", "wide", "round"];

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0; }
  return h >>> 0;
}

function recipeFor(word, x = 0, y = 0) {
  const key = `${word}|${Math.round(x)}|${Math.round(y)}`;
  const h = strHash(key);
  const pick = (arr, slot) => arr[((h ^ (slot * 2654435761)) >>> 0) % arr.length];
  const palette = pick(PALETTE_POOL, 1);
  return {
    font: pick(FONT_POOL, 2),
    weight: [400, 500, 700, 800][((h ^ 0xb1c2d3) >>> 0) % 4],
    italic: ((h ^ 0xa1b2c3) >>> 0) % 7 === 0,
    petalA: palette.a, petalB: palette.b, stroke: palette.stroke, textFill: palette.fill,
    leafStyle: pick(LEAF_POOL, 5),
  };
}

const leafColor   = "#6f9a5f";
const leafColorDk = "#3e6534";

function EarlyStage({ word, x, y, scale, stage, pressed, onPress }) {
  const seed      = Math.abs(Math.round(x * 13 + y * 7 + word.length * 31));
  const swayDur   = (2.6 + (seed % 24) * 0.08).toFixed(2);
  const swayDelay = ((seed % 19) * 0.13).toFixed(2);
  const r         = recipeFor(word, x, y);
  const sH        = stage >= 3 ? 18 * scale : 12 * scale;

  const handlers = {
    onClick: onPress ? (e) => { e.stopPropagation(); onPress({ word, x, y, scale, stage }); } : undefined,
    onPointerDown: (e) => e.stopPropagation(),
  };

  if (stage === 0) {
    return (
      <g className={`flower${pressed ? " pressed" : ""}`} transform={`translate(${x} ${y})`} {...handlers}>
        <g className="press-zoom">
          <ellipse cx="0" cy={3 * scale} rx={9 * scale} ry={3 * scale} fill="rgba(20,30,10,0.32)" />
          <path d={`M ${-9*scale} ${2*scale} Q 0 ${-5*scale} ${9*scale} ${2*scale} Q 0 ${4*scale} ${-9*scale} ${2*scale} Z`} fill="#7a5530" stroke="#3e2410" strokeWidth="0.8" />
          <ellipse cx={0} cy={-1 * scale} rx={2.4 * scale} ry={3.2 * scale} fill="#d9a85a" stroke="#7a4a1a" strokeWidth="0.8" />
        </g>
      </g>
    );
  }

  if (stage === 1) {
    return (
      <g className={`flower${pressed ? " pressed" : ""}`} transform={`translate(${x} ${y})`} {...handlers}>
        <g className="press-zoom">
          <ellipse cx="0" cy={3 * scale} rx={9 * scale} ry={3 * scale} fill="rgba(20,30,10,0.3)" />
          <path d={`M ${-7*scale} ${2*scale} Q 0 ${-3*scale} ${7*scale} ${2*scale} Q 0 ${3.5*scale} ${-7*scale} ${2*scale} Z`} fill="#7a5530" stroke="#3e2410" strokeWidth="0.7" />
          <g className="sway" style={{ animationDuration: `${swayDur}s`, animationDelay: `${swayDelay}s`, transformOrigin: "0 0" }}>
            <path d={`M 0 0 Q ${-0.6*scale} ${-3*scale} 0 ${-6*scale}`} stroke={leafColorDk} strokeWidth={1.4 * scale} fill="none" strokeLinecap="round" />
            <path d={`M 0 ${-6*scale} Q ${4*scale} ${-9*scale} ${1*scale} ${-11*scale} Q ${-2*scale} ${-9*scale} 0 ${-6*scale} Z`} fill={leafColor} stroke={leafColorDk} strokeWidth="0.7" />
          </g>
        </g>
      </g>
    );
  }

  if (stage === 2) {
    return (
      <g className={`flower${pressed ? " pressed" : ""}`} transform={`translate(${x} ${y})`} {...handlers}>
        <g className="press-zoom">
          <ellipse cx="0" cy={2 * scale} rx={6 * scale} ry={2.2 * scale} fill="rgba(20,30,10,0.28)" />
          <g className="sway" style={{ animationDuration: `${swayDur}s`, animationDelay: `${swayDelay}s`, transformOrigin: "0 0" }}>
            <path d={`M 0 0 Q ${-1*scale} ${-sH*0.5} 0 ${-sH}`} stroke={leafColorDk} strokeWidth={1.6 * scale} fill="none" strokeLinecap="round" />
            <ellipse cx={-3.5 * scale} cy={-sH * 0.55} rx={4 * scale} ry={1.8 * scale} fill={leafColor} stroke={leafColorDk} strokeWidth="0.6" transform={`rotate(-25 ${-3.5*scale} ${-sH*0.55})`} />
            <ellipse cx={3.5 * scale} cy={-sH * 0.55} rx={4 * scale} ry={1.8 * scale} fill={leafColor} stroke={leafColorDk} strokeWidth="0.6" transform={`rotate(25 ${3.5*scale} ${-sH*0.55})`} />
          </g>
        </g>
      </g>
    );
  }

  // stages 3 & 4
  const budR     = stage === 3 ? 6 * scale : 9 * scale;
  const budColor = stage === 3 ? "#9cc47b" : r.petalA;
  const id       = `wp-${word}-${Math.round(x * 10)}-${Math.round(y * 10)}`;
  return (
    <g className={`flower${pressed ? " pressed" : ""}`} transform={`translate(${x} ${y})`} {...handlers}>
      <g className="press-zoom">
        <defs>
          <radialGradient id={`${id}-grad`} cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor={r.petalA} /><stop offset="100%" stopColor={r.petalB} />
          </radialGradient>
        </defs>
        <ellipse cx="0" cy={2 * scale} rx={6 * scale} ry={2.2 * scale} fill="rgba(20,30,10,0.28)" />
        <g className="sway" style={{ animationDuration: `${swayDur}s`, animationDelay: `${swayDelay}s`, transformOrigin: "0 0" }}>
          <path d={`M 0 0 Q ${-1.5*scale} ${-sH*0.5} 0 ${-sH}`} stroke={leafColorDk} strokeWidth={1.8 * scale} fill="none" strokeLinecap="round" />
          <ellipse cx={-3.5 * scale} cy={-sH * 0.5} rx={3.6 * scale} ry={2 * scale} fill={leafColor} stroke={leafColorDk} strokeWidth="0.5" transform={`rotate(-25 ${-3.5*scale} ${-sH*0.5})`} />
          <ellipse cx={3.5 * scale} cy={-sH * 0.7} rx={3.4 * scale} ry={1.8 * scale} fill={leafColor} stroke={leafColorDk} strokeWidth="0.5" transform={`rotate(30 ${3.5*scale} ${-sH*0.7})`} />
          <g transform={`translate(0 ${-sH - budR * 0.7})`}>
            {stage === 3 ? (
              <path d={`M 0 ${-budR*1.1} Q ${budR*0.8} ${-budR*0.2} ${budR*0.4} ${budR*0.6} Q 0 ${budR*0.85} ${-budR*0.4} ${budR*0.6} Q ${-budR*0.8} ${-budR*0.2} 0 ${-budR*1.1} Z`}
                fill={budColor} stroke={r.stroke} strokeWidth="0.7" />
            ) : (
              <ellipse cx="0" cy="0" rx={budR * 0.9} ry={budR} fill={`url(#${id}-grad)`} stroke={r.stroke} strokeWidth="0.7" />
            )}
          </g>
        </g>
      </g>
    </g>
  );
}

export function WordPlant({ x, y, word, scale = 1, tilt = 0, pressed, onPress, stage = 5 }) {
  const r     = useMemo(() => recipeFor(word, x, y), [word, x, y]);
  const len   = word.length;
  const fontSize = Math.max(10, Math.min(18, 22 - len * 1.2)) * scale;
  const stemH    = 22 * scale;
  const id       = `wp-${word}-${Math.round(x * 10)}-${Math.round(y * 10)}`;

  const seed      = Math.abs(Math.round(x * 13 + y * 7 + word.length * 31));
  const swayDur   = (2.6 + (seed % 24) * 0.08).toFixed(2);
  const swayDelay = ((seed % 19) * 0.13).toFixed(2);

  if (stage < 5) {
    return <EarlyStage word={word} x={x} y={y} scale={scale} stage={stage} pressed={pressed} onPress={onPress} />;
  }

  // ── Full bloom ──
  // Disk radius sized to contain the word
  const isCJK = /[　-鿿]/.test(word);
  const charW = isCJK ? fontSize : fontSize * 0.58;
  const diskR = (word.length * charW) / 2 + fontSize * 0.55;

  // Petals radiate outward from the disk edge
  const petalCount = 5 + ((strHash(word) ^ 0xc3d4) % 3);
  const petalLen = diskR * 0.65;
  const petals = [...Array(petalCount)].map((_, i) => {
    const a = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    const dist = diskR + petalLen * 0.45;
    const cx = Math.cos(a) * dist;
    const cy = Math.sin(a) * dist * 0.82;
    return (
      <ellipse key={i} cx={cx} cy={cy}
        rx={petalLen * 0.52} ry={petalLen * 0.32}
        fill={`url(#${id}-grad)`} stroke={r.stroke} strokeWidth="0.7"
        transform={`rotate(${(a * 180 / Math.PI) + 90} ${cx} ${cy})`}
      />
    );
  });

  const leaves = r.leafStyle === "thin" ? (
    <>
      <ellipse cx={-3 * scale} cy={-stemH * 0.5} rx={3.5 * scale} ry={1.4 * scale} fill={leafColor} stroke={leafColorDk} strokeWidth="0.5" transform={`rotate(-30 ${-3*scale} ${-stemH*0.5})`} />
      <ellipse cx={3 * scale} cy={-stemH * 0.7} rx={3.2 * scale} ry={1.3 * scale} fill={leafColor} stroke={leafColorDk} strokeWidth="0.5" transform={`rotate(28 ${3*scale} ${-stemH*0.7})`} />
    </>
  ) : r.leafStyle === "wide" ? (
    <>
      <path d={`M 0 ${-stemH*0.5} Q ${-7*scale} ${-stemH*0.5} ${-6*scale} ${-stemH*0.3} Q ${-2*scale} ${-stemH*0.4} 0 ${-stemH*0.5} Z`} fill={leafColor} stroke={leafColorDk} strokeWidth="0.5" />
      <path d={`M 0 ${-stemH*0.7} Q ${7*scale} ${-stemH*0.7} ${6*scale} ${-stemH*0.5} Q ${2*scale} ${-stemH*0.6} 0 ${-stemH*0.7} Z`} fill={leafColor} stroke={leafColorDk} strokeWidth="0.5" />
    </>
  ) : (
    <>
      <ellipse cx={-3.5 * scale} cy={-stemH * 0.5} rx={4 * scale} ry={2.2 * scale} fill={leafColor} stroke={leafColorDk} strokeWidth="0.5" transform={`rotate(-25 ${-3.5*scale} ${-stemH*0.5})`} />
      <ellipse cx={3.5 * scale} cy={-stemH * 0.7} rx={3.8 * scale} ry={2 * scale} fill={leafColor} stroke={leafColorDk} strokeWidth="0.5" transform={`rotate(30 ${3.5*scale} ${-stemH*0.7})`} />
    </>
  );

  return (
    <g
      className={`flower${pressed ? " pressed" : ""}`}
      transform={`translate(${x} ${y}) rotate(${tilt})`}
      onClick={onPress ? (e) => { e.stopPropagation(); onPress({ word, x, y, scale }); } : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ cursor: onPress ? "pointer" : "default" }}
    >
      <g className="press-zoom">
        <defs>
          <radialGradient id={`${id}-grad`} cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor={r.petalA} />
            <stop offset="100%" stopColor={r.petalB} />
          </radialGradient>
        </defs>
        <ellipse cx="0" cy={2 * scale} rx={6 * scale} ry={2.2 * scale} fill="rgba(20,30,10,0.28)" />
        <path d={`M ${-4*scale} 0 q ${1.5*scale} ${-5*scale} ${4*scale} ${-7*scale} q ${-2*scale} ${4*scale} ${-3*scale} ${7*scale}`} fill="#7fb86b" stroke="#2b3f1a" strokeWidth="0.4" />
        <path d={`M ${4*scale} 0 q ${-1.5*scale} ${-5*scale} ${-4*scale} ${-7*scale} q ${2*scale} ${4*scale} ${3*scale} ${7*scale}`} fill="#5a9333" stroke="#2b3f1a" strokeWidth="0.4" />
        <g className="sway" style={{ animationDuration: `${swayDur}s`, animationDelay: `${swayDelay}s` }}>
          <path d={`M 0 0 Q ${-1.5*scale} ${-stemH*0.5} 0 ${-stemH}`} stroke={leafColorDk} strokeWidth={2 * scale} fill="none" strokeLinecap="round" />
          {leaves}
          {/* Flower head: petals behind disk, disk on top, word inside */}
          <g transform={`translate(0 ${-stemH - diskR})`}>
            {petals}
            <circle cx="0" cy="0" r={diskR} fill={`url(#${id}-grad)`} stroke={r.stroke} strokeWidth="1.2" />
            <text
              x={0} y={fontSize * 0.36}
              textAnchor="middle"
              fontFamily={r.font}
              fontSize={fontSize}
              fontWeight={r.weight}
              fontStyle={r.italic ? "italic" : "normal"}
              fill={r.stroke}
              stroke={r.textFill}
              strokeWidth={fontSize * 0.1}
              paintOrder="stroke"
            >
              {word}
            </text>
          </g>
        </g>
      </g>
    </g>
  );
}
