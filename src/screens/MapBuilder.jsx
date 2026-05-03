import { useEffect, useRef, useState, useCallback } from "react";

// Buildable world — larger than the old 900×1200 to give plenty of room.
// 2000 × 2400 = 31 cols × 37 rows = 1147 grid cells.
const WORLD = { w: 2000, h: 2400 };
const T = 64; // grid cell size (display, 16px source × 4)
const STORAGE_KEY = "learndo_custom_map_v1";

// Each tileset: id used in code, file URL, cols × rows of 16×16 frames, label
const TILESETS = [
  { id: "ts-grass",      file: "/assets/tiles/grass_tileset.png",       cols: 20, rows: 8,  name: "Grass" },
  { id: "ts-grass-dark", file: "/assets/tiles/dark_grass_tileset.png",  cols: 26, rows: 7,  name: "Dark Grass" },
  { id: "ts-dirt",       file: "/assets/tiles/dirt_path_tileset.png",   cols: 8,  rows: 7,  name: "Dirt Path" },
  { id: "ts-water",      file: "/assets/tiles/water_tileset.png",       cols: 8,  rows: 7,  name: "Water" },
  { id: "ts-brick",      file: "/assets/tiles/brick_floor_tileset.png", cols: 8,  rows: 7,  name: "Brick" },
  { id: "ts-fence",      file: "/assets/tiles/wood_fence_tileset.png",  cols: 4,  rows: 5,  name: "Wood Fence" },
  { id: "ts-objects",    file: "/assets/tiles/objects_terrain.png",     cols: 23, rows: 21, name: "Objects" },
  { id: "ts-stones",     file: "/assets/tiles/stone_objects.png",       cols: 11, rows: 15, name: "Stones" },
  { id: "ts-trees",      file: "/assets/tiles/terrain-trees.png",       cols: 15, rows: 13, name: "Trees (small)" },
  { id: "ts-big-trees",  file: "/assets/tiles/big_trees.png",           cols: 35, rows: 33, name: "Trees (big)" },
];

const SCALES = [2, 3, 4];      // 16px × scale = 32 / 48 / 64 px display
const DEFAULT_SCALE = 4;

// ── localStorage helpers ────────────────────────────────────────────────────
function loadPlacements() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function savePlacements(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {}
}

// ── Image loader (returns a promise of <img> elements keyed by tileset id) ─
function loadImages() {
  const out = {};
  return Promise.all(TILESETS.map(ts => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { out[ts.id] = img; resolve(); };
    img.onerror = reject;
    img.src = ts.file;
  }))).then(() => out);
}

// ── Component ───────────────────────────────────────────────────────────────
export function MapBuilder() {
  const canvasRef = useRef(null);
  const imagesRef = useRef({});
  const [imagesReady, setImagesReady] = useState(false);
  const [placements, setPlacements] = useState(() => loadPlacements());
  const [selected, setSelected] = useState(null); // { set, frame }
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [snap, setSnap] = useState(true);
  const [activeTab, setActiveTab] = useState(TILESETS[0].id);
  const [showGrid, setShowGrid] = useState(true);
  const [exportText, setExportText] = useState("");
  const draggingRef = useRef(false);

  // Load all spritesheets once
  useEffect(() => {
    loadImages().then(imgs => {
      imagesRef.current = imgs;
      setImagesReady(true);
    });
  }, []);

  // Re-render canvas whenever placements / settings change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesReady) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // Background — pale grass green
    ctx.fillStyle = "#a8d48a";
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    // Render every placement (in array order so later ones cover earlier)
    placements.forEach(p => {
      const img = imagesRef.current[p.set];
      if (!img) return;
      const meta = TILESETS.find(t => t.id === p.set);
      if (!meta) return;
      const fx = (p.frame % meta.cols) * 16;
      const fy = Math.floor(p.frame / meta.cols) * 16;
      const dw = 16 * (p.scale ?? 4);
      const dh = 16 * (p.scale ?? 4);
      ctx.drawImage(img, fx, fy, 16, 16, p.x - dw / 2, p.y - dh / 2, dw, dh);
    });

    // Grid overlay
    if (showGrid) {
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= WORLD.w; x += T) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, WORLD.h); ctx.stroke();
      }
      for (let y = 0; y <= WORLD.h; y += T) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(WORLD.w, y + 0.5); ctx.stroke();
      }
    }
  }, [placements, imagesReady, showGrid]);

  useEffect(redraw, [redraw]);

  // ── Pointer handlers on the canvas ────────────────────────────────────────
  const canvasToWorld = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const sx = WORLD.w / r.width;
    const sy = WORLD.h / r.height;
    let x = (e.clientX - r.left) * sx;
    let y = (e.clientY - r.top)  * sy;
    if (snap) {
      x = Math.floor(x / T) * T + T / 2;
      y = Math.floor(y / T) * T + T / 2;
    }
    return { x: Math.round(x), y: Math.round(y) };
  };

  const placeAt = (x, y) => {
    if (!selected) return;
    setPlacements(prev => [...prev, { set: selected.set, frame: selected.frame, x, y, scale }]);
  };

  const removeAt = (x, y) => {
    setPlacements(prev => {
      // Remove the topmost (last-added) tile whose bounding box covers (x,y)
      for (let i = prev.length - 1; i >= 0; i--) {
        const p = prev[i];
        const half = (16 * (p.scale ?? 4)) / 2;
        if (Math.abs(p.x - x) <= half && Math.abs(p.y - y) <= half) {
          return [...prev.slice(0, i), ...prev.slice(i + 1)];
        }
      }
      return prev;
    });
  };

  const onCanvasPointerDown = (e) => {
    e.preventDefault();
    const { x, y } = canvasToWorld(e);
    if (e.button === 2) { removeAt(x, y); return; }
    if (e.shiftKey)     { removeAt(x, y); return; }
    placeAt(x, y);
    draggingRef.current = true;
  };
  const onCanvasPointerMove = (e) => {
    if (!draggingRef.current) return;
    const { x, y } = canvasToWorld(e);
    if (e.shiftKey) removeAt(x, y);
    else            placeAt(x, y);
  };
  const onCanvasPointerUp = () => { draggingRef.current = false; };

  // ── Toolbar actions ──────────────────────────────────────────────────────
  const handleSave   = () => { savePlacements(placements); alert(`Saved ${placements.length} tiles to localStorage.`); };
  const handleClear  = () => { if (confirm("Clear the entire map?")) setPlacements([]); };
  const handleUndo   = () => setPlacements(p => p.slice(0, -1));
  const handleExport = () => {
    setExportText(JSON.stringify(placements, null, 2));
  };
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(placements, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "garden-map.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { setPlacements(JSON.parse(reader.result)); } catch { alert("Invalid JSON"); } };
    reader.readAsText(file);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const activeTs = TILESETS.find(t => t.id === activeTab);

  return (
    <div className="builder-root">
      {/* TOOLBAR */}
      <div className="builder-toolbar">
        <strong style={{ fontSize: 14 }}>🏗️ Map Builder</strong>
        <span style={{ flex: 1 }} />
        <span className="muted">{placements.length} tiles</span>
        <label><input type="checkbox" checked={snap}     onChange={e => setSnap(e.target.checked)} /> snap</label>
        <label><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> grid</label>
        <label>
          scale&nbsp;
          <select value={scale} onChange={e => setScale(+e.target.value)}>
            {SCALES.map(s => <option key={s} value={s}>{s}× ({16 * s}px)</option>)}
          </select>
        </label>
        <button onClick={handleUndo}    disabled={!placements.length}>↶ undo</button>
        <button onClick={handleClear}   disabled={!placements.length}>clear</button>
        <button onClick={handleSave}>💾 save</button>
        <button onClick={handleExport}>📋 export</button>
        <button onClick={handleDownload}>⬇ download</button>
        <label className="builder-import">
          ⬆ import
          <input type="file" accept="application/json" onChange={handleImport} hidden />
        </label>
      </div>

      <div className="builder-body">
        {/* PALETTE */}
        <div className="builder-palette">
          <div className="builder-palette-tabs">
            {TILESETS.map(ts => (
              <button
                key={ts.id}
                className={`builder-tab${activeTab === ts.id ? " active" : ""}`}
                onClick={() => setActiveTab(ts.id)}
              >{ts.name}</button>
            ))}
          </div>
          <div className="builder-palette-sheet">
            <PaletteSheet ts={activeTs} selected={selected} onPick={(frame) => setSelected({ set: activeTs.id, frame })} />
            <div className="builder-pick-info">
              {selected
                ? <span>Selected: <code>{selected.set}</code> frame <code>{selected.frame}</code></span>
                : <span className="muted">Click a tile to select it</span>}
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div className="builder-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={WORLD.w}
            height={WORLD.h}
            className="builder-canvas"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerLeave={onCanvasPointerUp}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div className="builder-canvas-help muted">
            <strong>Click</strong> place &nbsp;·&nbsp; <strong>drag</strong> paint &nbsp;·&nbsp; <strong>Shift+drag / right-click</strong> erase
          </div>
        </div>
      </div>

      {/* EXPORT MODAL */}
      {exportText && (
        <div className="builder-export-modal" onClick={() => setExportText("")}>
          <div className="builder-export-card" onClick={e => e.stopPropagation()}>
            <h3>Export</h3>
            <textarea value={exportText} readOnly rows={20} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => navigator.clipboard.writeText(exportText)}>Copy</button>
              <button onClick={() => setExportText("")}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Palette sheet — shows the spritesheet image with a selectable grid ─────
function PaletteSheet({ ts, selected, onPick }) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const onResize = () => {
      const el = wrapRef.current; if (!el) return;
      // Aim for tile cell ~24px on screen for clarity
      const cellPx = 24;
      const w = ts.cols * cellPx;
      const h = ts.rows * cellPx;
      setSize({ w, h });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ts]);

  const handleClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width  * ts.cols;
    const cy = (e.clientY - r.top)  / r.height * ts.rows;
    const col = Math.floor(cx), row = Math.floor(cy);
    if (col < 0 || col >= ts.cols || row < 0 || row >= ts.rows) return;
    onPick(row * ts.cols + col);
  };

  const isSelected = selected?.set === ts.id;
  const selCol = isSelected ? (selected.frame % ts.cols) : -1;
  const selRow = isSelected ? Math.floor(selected.frame / ts.cols) : -1;
  const cellW = size.w / ts.cols, cellH = size.h / ts.rows;

  return (
    <div ref={wrapRef} className="palette-sheet-wrap" style={{ width: size.w, height: size.h }} onClick={handleClick}>
      <img
        src={ts.file}
        alt={ts.name}
        draggable={false}
        style={{ width: size.w, height: size.h, imageRendering: "pixelated", display: "block" }}
      />
      {/* grid overlay */}
      <svg className="palette-grid" width={size.w} height={size.h}>
        {Array.from({ length: ts.cols + 1 }).map((_, i) => (
          <line key={"v" + i} x1={i * cellW} y1={0} x2={i * cellW} y2={size.h} stroke="rgba(0,0,0,0.12)" />
        ))}
        {Array.from({ length: ts.rows + 1 }).map((_, i) => (
          <line key={"h" + i} x1={0} y1={i * cellH} x2={size.w} y2={i * cellH} stroke="rgba(0,0,0,0.12)" />
        ))}
        {isSelected && (
          <rect x={selCol * cellW} y={selRow * cellH} width={cellW} height={cellH}
                fill="none" stroke="#e87aa3" strokeWidth="2" />
        )}
      </svg>
    </div>
  );
}
