import Phaser from "phaser";
import { useRef, useEffect } from "react";
import { wordTheme, phaserFontStyle, THEME_FONT_NAMES } from "../utils/wordTheme";

export const WORLD = { w: 2000, h: 2400 };

// SVG ↔ Phaser world coordinate conversion
// The old SVG viewBox was "-450 -100 900 1200"; Phaser world is 0,0→900,1200
const SVG_TO_PH = (x, y) => ({ x: x + 450, y: y + 100 });

function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return h;
}

// Reaction → gem-trim color: a thin outer stroke behind the cream stroke,
// matching the per-reaction palette used on the prismatic cards.
const REACTION_TRIM = {
  "🌸": "#e87aa3",
  "💧": "#5abde8",
  "✨": "#e8a91a",
  "🌟": "#f3c14a",
  "💕": "#e0526d",
  "🌈": "#d4267a",
};


function makeLcg(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ── Sprite palettes ─────────────────────────────────────────────────────────
// Sprite keys are PATH-prefixed so they're unique across folders. The full
// URL is built as `/assets/${key}.png`.
//
// Layout (after the user reorganized):
//   flowers1/  — empty-pot, sprouts (f1-f9), AND simple pot flowers (pot1-pot7)
//                used as: stage 1 + stage 2 (universal) AND stage 3 for BEGINNER
//   flowers2/  — bigger mature flowers (Pink/Purple/Red Rose/Yellow varieties)
//                used as: stage 3 for INTERMEDIATE
//   flowers3/  — premium mature flowers (Premium1-6, Flower1, Flower2, etc.)
//                used as: stage 3 for ADVANCED
const SPROUT_SPRITES = [
  "flowers1/f7-blue",   "flowers1/f7-pink",   "flowers1/f7-purple", "flowers1/f7-orange",
  "flowers1/f9-orange", "flowers1/f9-purple", "flowers1/f9-red",    "flowers1/f9-yellow",
  "flowers1/f1-blue",   "flowers1/f1-red",    "flowers1/f1-yellow", "flowers1/f1-teal",
  "flowers1/f3-blue",   "flowers1/f3-pink",   "flowers1/f3-purple",
  "flowers1/f6-blue",   "flowers1/f6-orange", "flowers1/f6-pink",   "flowers1/f6-purple",
];

const FLOWERS_TIER = {
  beginner: [
    // Simple pot-flower sprites — beginner mature stage
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

// Backwards-compat export — defaults to tier-1 for any external callers
// (CollectionPanel/GiftPickerPanel now compute their own per-tier choice).
export const POT_SPRITES = FLOWERS_TIER.beginner;

// 3 visual stages, but internal stage goes 0-4 (each watering is +1).
//   internal 0,1 → seed       (visual 1)
//   internal 2,3 → sprout     (visual 2)  — reached after 2 waterings
//   internal 4   → mature     (visual 3)  — reached after 2 more waterings
function visualStage(stage) {
  if (stage <= 1) return 1;
  if (stage <= 3) return 2;
  return 3;
}

function tierFor(level) {
  return FLOWERS_TIER[level] || FLOWERS_TIER.beginner;
}

function spriteForStage(styleIdx, stage, level) {
  const v = visualStage(stage);
  if (v === 1) return "flowers1/empty-pot";
  if (v === 2) return SPROUT_SPRITES[styleIdx % SPROUT_SPRITES.length];
  const list = tierFor(level);
  return list[styleIdx % list.length];
}

// Target display HEIGHT in px (we scale to hit this regardless of source size).
function targetHeightForStage(stage) {
  const v = visualStage(stage);
  if (v === 1) return 50;
  if (v === 2) return 70;
  return 110;
}

// Approximate the original SVG cubic-bezier dirt path as polyline (Phaser coords)
const PATH_PTS = [
  190,60,  225,100, 265,125, 310,130, 360,120, 405,100, 445,70, 510,40,
  555,55,  595,100, 610,155, 595,200, 565,240, 515,265, 455,275, 395,285,
  345,300, 295,325, 255,360, 225,405, 205,455, 210,505, 255,525, 340,538,
  400,548, 430,565, 435,600, 428,640, 415,680,
].reduce((acc, v, i) => { i % 2 === 0 ? acc.push({ x: v }) : (acc[acc.length - 1].y = v); return acc; }, []);


// ── Phaser Scene ─────────────────────────────────────────────────────────────
class GardenScene extends Phaser.Scene {
  constructor() { super({ key: "Garden" }); }

  preload() {
    const t = "/assets/tiles/";
    // Plant sprites — keys carry their folder prefix, the full URL is /assets/{key}.png
    const plantKeys = new Set([
      "flowers1/empty-pot",
      ...SPROUT_SPRITES,
      ...FLOWERS_TIER.beginner,
      ...FLOWERS_TIER.intermediate,
      ...FLOWERS_TIER.advanced,
    ]);
    plantKeys.forEach(k => this.load.image(k, `/assets/${k}.png`));
    // Terrain trees spritesheet — 16×16 px per frame, 15 cols × 13 rows
    this.load.spritesheet("terrain-trees", t + "terrain-trees.png", { frameWidth: 16, frameHeight: 16 });


    // Pet spritesheets — 4×4 grid, 64×64 per frame
    const p = "/assets/pets/";
    this.load.spritesheet("pets-walk", p + "Root_Walk.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("pets-idle", p + "Root_Idle.png", { frameWidth: 64, frameHeight: 64 });

    // Terrain tilesets (keys must match the MapBuilder's TILESETS ids)
    this.load.spritesheet("ts-grass",      t + "grass_tileset.png",       { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-grass-dark", t + "dark_grass_tileset.png",  { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-dirt",       t + "dirt_path_tileset.png",   { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-water",      t + "water_tileset.png",       { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-brick",      t + "brick_floor_tileset.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-fence",      t + "wood_fence_tileset.png",  { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-objects",    t + "objects_terrain.png",     { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-stones",     t + "stone_objects.png",       { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-trees",      t + "terrain-trees.png",       { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-big-trees",  t + "big_trees.png",           { frameWidth: 16, frameHeight: 16 });

    // Custom map JSON — tile placements built with /#/build-map
    this.load.json("garden-map", "/garden_map.json");
  }

  create() {
    const reg = this.game.registry;
    this.propsRef     = reg.get("propsRef");
    this.callbacksRef = reg.get("callbacksRef");
    this.vpRef        = reg.get("vpRef");

    this.plantLayer   = this.add.layer();
    this.plantClicked = false;

    // If a custom map JSON is loaded, render from it; otherwise fall back
    // to the procedural builder.
    const customMap = this.cache.json.get("garden-map");
    if (Array.isArray(customMap) && customMap.length > 0) {
      this.drawCustomMap(customMap);
    } else {
      this.drawGround();
      this.addDecorations();
      this.addTrees();
    }
    this.addAnimals();
    this.setupCamera();
    this.setupInput();
    this.setupWeather();
    this.setupExternalResetBridge();

    // Register scene so React can call updateFromProps
    reg.set("scene", this);

    // Initial render + cam event after first layout tick
    this.time.delayedCall(50, () => {
      this.updateFromProps(this.propsRef.current);
      this.emitCam();
    });

    this.scale.on("resize", () => this.emitCam());
  }

  // ── Custom map — render every tile placement from garden_map.json ───────
  // Ground tilesets render at a fixed low depth; everything else (trees,
  // fences, objects) gets `depth = y` so they sort with plants.
  drawCustomMap(tiles) {
    const GROUND_SETS = new Set([
      "ts-grass", "ts-grass-dark", "ts-dirt", "ts-water", "ts-brick",
    ]);
    let groundIdx = 0;
    for (const t of tiles) {
      if (!t || !t.set) continue;
      const isGround = GROUND_SETS.has(t.set);
      // Tiny epsilon offsets keep ground tiles in placement order without
      // letting them ever climb above plants/trees.
      const depth = isGround ? -2000 + (groundIdx++ * 0.0001) : (t.y || 0);
      this.add.image(t.x, t.y, t.set, t.frame)
        .setScale(t.scale ?? 4)
        .setOrigin(0.5, 0.5)
        .setDepth(depth);
    }
  }

  // ── Ground (autotile terrain, 16 px source × scale 4 = 64 px display) ───
  drawGround() {
    const T = 64, SC = 4;
    const COLS = Math.ceil(WORLD.w / T) + 1;
    const ROWS = Math.ceil(WORLD.h / T) + 1;
    const GRASS = 0, DIRT = 1, WATER = 2;

    // Build terrain grid
    const grid = [];
    for (let r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(GRASS));

    // Mark dirt path cells
    for (let i = 0; i < PATH_PTS.length - 1; i++) {
      const p0 = PATH_PTS[i], p1 = PATH_PTS[i + 1];
      const steps = Math.ceil(Math.hypot(p1.x - p0.x, p1.y - p0.y) / 8);
      for (let s = 0; s <= steps; s++) {
        const tt = s / steps;
        const c = Math.floor((p0.x + (p1.x - p0.x) * tt) / T);
        const r = Math.floor((p0.y + (p1.y - p0.y) * tt) / T);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = DIRT;
      }
    }

    // Mark pond (3×3 at col 10, row 3)
    const PX = 10, PY = 3;
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++)
        if (PY + dr < ROWS && PX + dc < COLS) grid[PY + dr][PX + dc] = WATER;


    // Grass autotile frame map: key = 'TRBL' (1=grass neighbor, 0=non-grass)
    // Derived by pixel-sampling all 160 frames of grass_tileset.png
    const GTILE = {
      '0000': [123, 130, 137],
      '0001': [105, 112, 119],
      '0010': [102, 109, 116],
      '0011': [2, 5, 9, 12, 16],
      '0100': [103, 110, 117],
      '0101': [104, 111, 118],
      '0110': [0, 3, 7, 10, 14],
      '0111': [1, 4, 8, 11, 15],
      '1000': [142, 149, 156],
      '1001': [42, 45, 49, 52, 56],
      '1010': [122, 129, 136],
      '1011': [22, 25, 29, 32, 36],
      '1100': [40, 43, 47, 50, 54],
      '1101': [41, 44, 48, 51, 55],
      '1110': [20, 23, 27, 30, 34],
      '1111': [21, 28, 35],
    };

    const rng = makeLcg(42);
    const cellType = (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= COLS) ? GRASS : grid[r][c];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = grid[r][c];
        const wx = c * T + T / 2, wy = r * T + T / 2;

        if (type === GRASS) {
          const tn = cellType(c, r - 1) === GRASS ? 1 : 0;
          const rn = cellType(c + 1, r) === GRASS ? 1 : 0;
          const bn = cellType(c, r + 1) === GRASS ? 1 : 0;
          const ln = cellType(c - 1, r) === GRASS ? 1 : 0;
          const variants = GTILE[`${tn}${rn}${bn}${ln}`] ?? GTILE['1111'];
          const frame = variants[Math.floor(rng() * variants.length)];
          this.add.image(wx, wy, "ts-grass", frame).setScale(SC).setDepth(-2000);
        } else if (type === DIRT) {
          this.add.image(wx, wy, "ts-dirt", 9).setScale(SC).setDepth(-1500);
        }
        // WATER rendered below as a 3×3 block
      }
    }

    // Pond — 3×3 water tiles
    const POND = [
      [ 0,  1,  2],
      [ 8,  9, 10],
      [16, 17, 18],
    ];
    POND.forEach((row, dr) =>
      row.forEach((frame, dc) =>
        this.add.image((PX + dc) * T + T / 2, (PY + dr) * T + T / 2, "ts-water", frame)
          .setScale(SC).setDepth(-1497)
      )
    );

    // Lily pads on the pond — single-tile decorations from objects_terrain.png.
    // The lily-pad cluster sits around rows 8-10, cols 14-16 of the sheet
    // (sheet is 23 cols wide → idx = row*23 + col).
    const LILY_PADS = [
      8 * 23 + 14, 8 * 23 + 15, 8 * 23 + 16,
      9 * 23 + 14, 9 * 23 + 15, 9 * 23 + 16,
      10 * 23 + 14, 10 * 23 + 15, 10 * 23 + 16,
    ];
    const padPositions = [
      { c: PX,     r: PY,     pad: 0, ox: 8,  oy: 6  },
      { c: PX + 2, r: PY + 1, pad: 4, ox: -4, oy: 0  },
      { c: PX + 1, r: PY + 2, pad: 7, ox: 6,  oy: -4 },
    ];
    padPositions.forEach(({ c, r, pad, ox, oy }) => {
      this.add.image(c * T + T / 2 + ox, r * T + T / 2 + oy, "ts-objects",
                     LILY_PADS[pad % LILY_PADS.length])
        .setScale(SC).setDepth(-1495);
    });

    // Vignette overlay (slight darken at edges for depth)
    const vg = this.add.graphics().setDepth(-1000);
    vg.fillGradientStyle(0x1c3010, 0x1c3010, 0x1c3010, 0x1c3010, 0, 0, 0, 0.2);
    vg.fillRect(0, 0, WORLD.w, WORLD.h);
  }

  // ── Scattered decorations (flowers, mushrooms, small stones) ────────────
  // Single-tile sprites scattered on grass. Frame indices were picked from
  // objects_terrain.png (23 cols × 21 rows of 16×16) and stone_objects.png
  // (11 cols × 15 rows). Numbers below were chosen by visually scanning the
  // sheets for standalone "feels-good-on-grass" tiles.
  addDecorations() {
    const T = 64;
    const COLS = Math.ceil(WORLD.w / T) + 1;
    const ROWS = Math.ceil(WORLD.h / T) + 1;

    // Re-derive what's grass vs path/pond using the same logic as drawGround
    const PX = 10, PY = 3;       // pond corner (must match drawGround)
    const isWater = (c, r) => c >= PX && c < PX + 3 && r >= PY && r < PY + 3;
    const pathSet = new Set();
    for (let i = 0; i < PATH_PTS.length - 1; i++) {
      const p0 = PATH_PTS[i], p1 = PATH_PTS[i + 1];
      const steps = Math.ceil(Math.hypot(p1.x - p0.x, p1.y - p0.y) / 8);
      for (let s = 0; s <= steps; s++) {
        const tt = s / steps;
        const c = Math.floor((p0.x + (p1.x - p0.x) * tt) / T);
        const r = Math.floor((p0.y + (p1.y - p0.y) * tt) / T);
        pathSet.add(`${c},${r}`);
      }
    }
    const isGrass = (c, r) => !isWater(c, r) && !pathSet.has(`${c},${r}`);

    // Curated frame indices, sampled by visually scanning the sheets for
    // standalone single-tile decorations. 23 cols/row → idx = row*23 + col.
    const TUFTS = [
      // Tiny grass tufts (rows 0-2) — densely safe, all standalone
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
      46, 47, 48, 49, 50, 51, 52,
    ];
    const FLOWERS = [
      // Tall single-flower stalks on the right side of rows 0-7
      // (red poppies, blue cornflowers, yellow daisies)
      14, 15, 16, 17, 18,
      37, 38, 39, 40, 41,
      60, 61, 62, 63, 64,
      83, 84, 85, 86, 87,
      106, 107, 108, 109, 110,
      129, 130, 131, 132, 133,
    ];
    const MUSHROOMS = [
      // Mushroom clusters — right portion of rows 13-15
      312, 313, 314, 315, 316, 317,
      335, 336, 337, 338, 339, 340,
      358, 359, 360, 361, 362, 363,
    ];
    // 11 cols/row in stone_objects.png → idx = row*11 + col
    const SMALL_STONES = [
      // Final rows have small standalone pebbles
      143, 144, 145, 146, 147,
      154, 155, 156, 157, 158,
    ];

    const SC = 3;
    const STONE_SC = 2.5;
    const rng = makeLcg(7919);

    // Higher density on the outer edges (forest feel), lighter in the middle
    // where plants live. Combined with seed-deterministic placement.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!isGrass(c, r)) continue;

        // Higher density near edges, lighter in middle plant-belt
        const middleY = r >= 1 && r <= 8;
        const middleX = c >= 1 && c <= 9;
        const inPlantBelt = middleY && middleX;
        const density = inPlantBelt ? 0.10 : 0.32;
        if (rng() > density) continue;

        const wx = c * T + Math.floor(rng() * (T - 28)) + 14;
        const wy = r * T + Math.floor(rng() * (T - 28)) + 14;

        const roll = rng();
        let key, frames, scale;
        if (roll < 0.45) {
          key = "ts-objects"; frames = TUFTS;        scale = SC;
        } else if (roll < 0.75) {
          key = "ts-objects"; frames = FLOWERS;      scale = SC;
        } else if (roll < 0.90) {
          key = "ts-objects"; frames = MUSHROOMS;    scale = SC;
        } else {
          key = "ts-stones";  frames = SMALL_STONES; scale = STONE_SC;
        }
        const frame = frames[Math.floor(rng() * frames.length)];
        this.add.image(wx, wy, key, frame)
          .setScale(scale).setOrigin(0.5, 1).setDepth(wy);
      }
    }

    // Stone border along the path — small pebbles flanking it
    const PEB_RNG = makeLcg(31415);
    const placedStones = new Set();
    for (let i = 0; i < PATH_PTS.length - 1; i++) {
      const p0 = PATH_PTS[i], p1 = PATH_PTS[i + 1];
      const steps = Math.ceil(Math.hypot(p1.x - p0.x, p1.y - p0.y) / 8);
      for (let s = 0; s <= steps; s += 3) {
        if (PEB_RNG() > 0.45) continue;
        const tt = s / steps;
        const px = p0.x + (p1.x - p0.x) * tt;
        const py = p0.y + (p1.y - p0.y) * tt;
        // Place a pebble nudged perpendicular to the path direction
        const dx = p1.x - p0.x, dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const side = PEB_RNG() > 0.5 ? 1 : -1;
        const offset = 38 + Math.floor(PEB_RNG() * 8);
        const sx = px + nx * offset * side;
        const sy = py + ny * offset * side;
        const sc = Math.floor(sx / T), sr = Math.floor(sy / T);
        if (!isGrass(sc, sr)) continue;
        const key = `${sc},${sr}`;
        if (placedStones.has(key)) continue;
        placedStones.add(key);
        const stoneFrame = SMALL_STONES[Math.floor(PEB_RNG() * SMALL_STONES.length)];
        this.add.image(sx, sy, "ts-stones", stoneFrame)
          .setScale(2.2).setOrigin(0.5, 1).setDepth(sy);
      }
    }
  }

  // ── Trees (terrain-trees.png, 15 cols × 13 rows of 16px tiles) ──────────
  addTrees() {
    const TSC = 3; // 16px tile × 3 = 48px per tile
    const TW = 16 * TSC;
    const SCOLS = 15; // spritesheet columns

    // Each entry: [dCol, dRow, spCol, spRow] — position in tree + source in sheet
    const TREE_A = [ // small round tree (spritesheet cols 0-2)
      [0,0,0,1],[1,0,1,1],[2,0,2,1],
      [0,1,0,2],[1,1,1,2],[2,1,2,2],
      [1,2,1,3],
      [1,3,1,4],
      [0,4,0,5],[1,4,1,5],[2,4,2,5],
      [0,5,0,6],[1,5,1,6],[2,5,2,6],
    ];
    const TREE_B = [ // medium tree (spritesheet cols 3-5)
      [0,0,3,1],[1,0,4,1],[2,0,5,1],
      [0,1,3,2],[1,1,4,2],[2,1,5,2],
      [1,2,4,3],
      [1,3,4,4],
      [0,4,3,5],[1,4,4,5],[2,4,5,5],
      [0,5,3,6],[1,5,4,6],[2,5,5,6],
    ];
    const TREE_C = [ // tall tree (spritesheet cols 6-8)
      [0,0,6,1],[1,0,7,1],[2,0,8,1],
      [0,1,6,2],[1,1,7,2],[2,1,8,2],
      [0,2,6,3],[1,2,7,3],[2,2,8,3],
      [0,3,6,4],[1,3,7,4],[2,3,8,4],
      [0,4,6,5],[1,4,7,5],[2,4,8,5],
      [0,5,6,6],[1,5,7,6],[2,5,8,6],
      [1,6,7,7],
    ];

    const placeTree = (wx, wy, def) => {
      const maxDr = def.reduce((m, [, r]) => Math.max(m, r), 0);
      const depth = wy + (maxDr + 1) * TW;
      def.forEach(([dc, dr, spCol, spRow]) => {
        const frame = spRow * SCOLS + spCol;
        this.add.image(wx + dc * TW, wy + dr * TW, "ts-trees", frame)
          .setScale(TSC).setOrigin(0, 0).setDepth(depth);
      });
    };

    // Placed at world edges & in the empty lower half — clear of path,
    // pond (x640-830,y190-380), and the upper plant belt (rows 1-8).
    [
      { x:   5, y:   5, def: TREE_C },
      { x: 750, y:  10, def: TREE_A },
      { x:   5, y: 450, def: TREE_A },
      { x: 750, y: 420, def: TREE_C },
      { x:   5, y: 700, def: TREE_B },
      { x: 720, y: 720, def: TREE_A },
      { x:  60, y: 870, def: TREE_B },
      { x: 750, y: 900, def: TREE_C },
      { x: 300, y:1050, def: TREE_A },
      { x: 600, y:1060, def: TREE_B },
      { x:  20, y:1080, def: TREE_A },
    ].forEach(({ x, y, def }) => placeTree(x, y, def));
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.w, WORLD.h);
    cam.setScroll(260, 50); // matches old t={x:-260,y:-50}
  }

  emitCam() {
    const el = this.vpRef?.current;
    if (!el) return;
    const cam = this.cameras.main;
    el.dispatchEvent(new CustomEvent("cam", {
      detail: {
        x: -cam.scrollX,
        y: -cam.scrollY,
        vw: this.scale.gameSize.width,
        vh: this.scale.gameSize.height,
      },
    }));
  }

  // ── Input (drag + plant/select tap) ─────────────────────────────────────
  setupInput() {
    const cam = this.cameras.main;
    this._drag = null;
    this._hasMoved = false;

    this.input.on("pointerdown", (p) => {
      this._drag = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY };
      this._hasMoved = false;
      this.plantClicked = false;
    });

    this.input.on("pointermove", (p) => {
      if (!this._drag) return;
      const dx = p.x - this._drag.x, dy = p.y - this._drag.y;
      if (Math.hypot(dx, dy) > 4) this._hasMoved = true;
      cam.setScroll(this._drag.sx - dx, this._drag.sy - dy);
      this.emitCam();
    });

    this.input.on("pointerup", (p) => {
      const wasPlantClick = this.plantClicked;
      this.plantClicked = false;
      if (this._drag && !this._hasMoved && !wasPlantClick) {
        const wx = p.x + cam.scrollX - 450;
        const wy = p.y + cam.scrollY - 100;
        if (this.propsRef.current.planting) {
          this.callbacksRef.current.onPlantAt?.(wx, wy);
        } else if (this.propsRef.current.moving) {
          this.callbacksRef.current.onMoveTo?.(wx, wy);
        } else {
          this.callbacksRef.current.setPressed?.(null);
        }
      }
      this._drag = null;
    });

    this.input.on("pointercancel", () => { this._drag = null; this._hasMoved = false; });
  }

  // Bridge: React dispatches a "reset-input" CustomEvent on .stage when an
  // overlay closes; we hook it up here so the scene resets cleanly.
  setupExternalResetBridge() {
    const el = this.vpRef?.current;
    if (!el) return;
    this._resetHandler = () => this.resetInput();
    el.addEventListener("reset-input", this._resetHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      el.removeEventListener("reset-input", this._resetHandler);
    });
  }

  // Force-clear any in-flight pointer state. Called from React when overlays
  // (like the Breeding Lab) that could swallow a pointerup are unmounted —
  // without this, the closure-scoped drag would stick and block both the
  // camera pan and tap-to-plant gestures.
  resetInput() {
    this._drag = null;
    this._hasMoved = false;
    this.plantClicked = false;
    // Also reset Phaser's own pointer state so isDown/wasCanceled don't leak.
    const ptr = this.input?.manager?.activePointer;
    if (ptr) {
      ptr.isDown = false;
      ptr.wasCanceled = true;
      ptr.reset?.();
    }
    this.input?.manager?.pointers?.forEach?.(p => {
      p.isDown = false;
      p.wasCanceled = true;
      p.reset?.();
    });
  }

  // ── Plants ────────────────────────────────────────────────────────────────
  updateFromProps({ plantedSeeds = [], pressed }) {
    this.plantLayer.removeAll(true);

    const all = [...plantedSeeds].sort((a, b) => a.y - b.y);

    all.forEach(f => this.addPlant(f, pressed));
  }

  addPlant(f, pressed) {
    const { x: px, y: py } = SVG_TO_PH(f.x, f.y);
    const stage = f.stage ?? 4;
    const si    = strHash(f.word) % 100;
    const key   = spriteForStage(si, stage, f.level);

    const img = this.add.image(0, 0, key).setOrigin(0.5, 1);
    // Scale to a target display height — works for both tiny (38px) old
    // sprites and tall (256px) new flower sprites.
    const targetH = targetHeightForStage(stage);
    img.setScale(targetH / (img.height || targetH));

    // Tight hit area — middle 55% wide × bottom 75% tall (in source pixels).
    // The new 256×256 flower sprites have lots of transparent margin, so a
    // default rectangle hit area would block clicks on neighboring tiles
    // and break move-mode placement.
    const hitW = img.width  * 0.55;
    const hitH = img.height * 0.75;
    const hitX = (img.width - hitW) / 2;
    const hitY = img.height - hitH;
    img.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(hitX, hitY, hitW, hitH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      cursor: "pointer",
    });

    const isSelected = pressed?.word === f.word && pressed?.x === f.x && pressed?.y === f.y;
    if (isSelected) img.setTint(0xffe86a);

    // Word label — sits on the flower head, theme picked by word hash.
    // For plants with a reaction, a wider colored stroke is rendered as a
    // back-layer to create a gem-trim ring around the cream outline.
    const theme = wordTheme(f.word, f.lang);
    const reaction = f.reactions?.[0];
    const trimColor = reaction ? (REACTION_TRIM[reaction.emoji] || "#e87aa3") : null;
    const wordY = -img.displayHeight * 0.78;
    const wordStyle = {
      fontFamily: theme.fontFamily,
      fontStyle: phaserFontStyle(theme),
      fontSize: "14px",
      color: theme.color,
      resolution: 2,
    };

    const trim = trimColor
      ? this.add.text(0, wordY, f.word, { ...wordStyle, stroke: trimColor, strokeThickness: 9 })
          .setOrigin(0.5, 0.5)
      : null;

    const txt = this.add.text(0, wordY, f.word, {
      ...wordStyle,
      stroke: "#fffde8",
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5);

    // Stagger animations by plant so they aren't all in sync
    const swayAngle = 2.5 + (si % 10) * 0.3;
    const swayDur   = 1800 + (si % 12) * 180;
    const swayDelay = (si % 20) * 130;

    // Build the container child list:
    //  pot → (optional gem-trim layer) → word → (optional reaction icon)
    const containerChildren = trim ? [img, trim, txt] : [img, txt];

    // Small emoji icon next to the word, kept for plants with a reaction
    if (reaction) {
      const emojiTxt = this.add.text(
        txt.displayWidth / 2 + 2,
        wordY,
        reaction.emoji,
        { fontSize: "12px", resolution: 2 }
      ).setOrigin(0, 0.5);
      containerChildren.push(emojiTxt);
    }

    // Container at base of plant — sway rotates around the pot bottom
    const container = this.add.container(px, py, containerChildren).setDepth(py);

    // Sway — uses the staggered values declared above
    this.tweens.add({
      targets: container,
      angle: { from: -swayAngle, to: swayAngle },
      duration: swayDur,
      delay: swayDelay,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    img.on("pointerup", (p, lx, ly, ev) => {
      ev.stopPropagation();
      this.plantClicked = true;
      const stemScale = img.displayHeight / 22;
      const pd = { word: f.word, x: f.x, y: f.y, scale: stemScale };
      this.callbacksRef.current.setPressed?.(prev =>
        prev?.word === f.word && prev?.x === f.x && prev?.y === f.y ? null : pd
      );
    });

    this.plantLayer.add(container);
  }

  // ── Animals ───────────────────────────────────────────────────────────────
  addAnimals() {
    // Cat uses rows 2 (south/face, frames 8-11) and 3 (north/back, frames 12-15)
    this.anims.create({ key: "cat-walk-south", frames: this.anims.generateFrameNumbers("pets-walk", { start:  8, end: 11 }), frameRate: 7, repeat: -1 });
    this.anims.create({ key: "cat-walk-north", frames: this.anims.generateFrameNumbers("pets-walk", { start: 12, end: 15 }), frameRate: 7, repeat: -1 });
    this.anims.create({ key: "cat-idle-south", frames: this.anims.generateFrameNumbers("pets-idle", { start:  8, end: 11 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: "cat-idle-north", frames: this.anims.generateFrameNumbers("pets-idle", { start: 12, end: 15 }), frameRate: 5, repeat: -1 });

    this.catSprite = this.add.sprite(490, 560, "pets-walk", 8).setScale(2.5).setOrigin(0.5, 1).setDepth(560).play("cat-walk-south");
    this.catState  = { x: 490, y: 560, tx: 570, ty: 580, rng: makeLcg(13), dir: "south" };
  }

  stepAnimal(state, sprite, speed, bx, by, dt) {
    const dx = state.tx - state.x, dy = state.ty - state.y, dist = Math.hypot(dx, dy);
    if (dist < 6) {
      state.tx = bx[0] + state.rng() * (bx[1] - bx[0]);
      state.ty = by[0] + state.rng() * (by[1] - by[0]);
      const idleKey = `cat-idle-${state.dir}`;
      if (sprite.anims.currentAnim?.key !== idleKey) sprite.play(idleKey);
    } else {
      const v = speed * dt;
      state.x += (dx / dist) * v;
      state.y += (dy / dist) * v;
      sprite.setPosition(state.x, state.y).setDepth(state.y);
      const vertical = Math.abs(dy) >= Math.abs(dx);
      const dir = vertical ? (dy > 0 ? "north" : "south") : state.dir;
      sprite.setFlipX(!vertical && dx < 0);
      const walkKey = `cat-walk-${dir}`;
      if (sprite.anims.currentAnim?.key !== walkKey) {
        state.dir = dir;
        sprite.play(walkKey);
      }
    }
  }

  // ── Weather ──────────────────────────────────────────────────────────────
  setupWeather() {
    // Weighted random — sunny most common, others sprinkle in for variety.
    const TABLE = [
      { type: "sunny",   weight: 4, label: "☀️ Sunny" },
      { type: "rain",    weight: 2, label: "🌧️ Rainy" },
      { type: "snow",    weight: 1, label: "❄️ Snowy" },
      { type: "petals",  weight: 2, label: "🌸 Petals" },
      { type: "leaves",  weight: 2, label: "🍃 Breezy" },
    ];
    const total = TABLE.reduce((s, w) => s + w.weight, 0);
    let r = Math.random() * total, chosen = TABLE[0];
    for (const w of TABLE) { r -= w.weight; if (r <= 0) { chosen = w; break; } }
    this.weather = chosen.type;
    this.weatherParticles = [];

    // Tell React (via the viewport DOM element) what weather we picked.
    const el = this.vpRef?.current;
    if (el) el.dispatchEvent(new CustomEvent("weather", { detail: { type: chosen.type, label: chosen.label } }));

    if (chosen.type === "sunny") return;
    const counts = { rain: 90, snow: 55, petals: 32, leaves: 22 };
    const count  = counts[chosen.type] ?? 30;
    for (let i = 0; i < count; i++) this.weatherParticles.push(this._spawnWeatherP(chosen.type, false));
  }

  _spawnWeatherP(type, fromTop) {
    const vw = this.scale.gameSize.width;
    const vh = this.scale.gameSize.height;
    const x  = Math.random() * vw;
    const y  = fromTop ? -20 - Math.random() * 50 : Math.random() * vh;
    let g;
    if (type === "rain") {
      g = this.add.rectangle(x, y, 1.5, 8, 0x9cc4ff, 0.55);
      g.angle = -10;
      g.vx = -1.5; g.vy = 11 + Math.random() * 5;
    } else if (type === "snow") {
      g = this.add.circle(x, y, 1.5 + Math.random() * 1, 0xffffff, 0.85);
      g.vx = (Math.random() - 0.5) * 0.6;
      g.vy = 0.8 + Math.random() * 0.8;
      g.swayPhase = Math.random() * Math.PI * 2;
    } else if (type === "petals") {
      const colors = [0xffaad0, 0xffc8d8, 0xff7aa3, 0xffd0e0];
      g = this.add.circle(x, y, 2 + Math.random() * 1.5,
                          colors[Math.floor(Math.random() * colors.length)], 0.85);
      g.vx = -1.6 - Math.random() * 0.8;
      g.vy = 0.6 + Math.random() * 0.5;
      g.swayPhase = Math.random() * Math.PI * 2;
    } else if (type === "leaves") {
      g = this.add.text(x, y, "🍃", { fontSize: "13px" }).setOrigin(0.5);
      g.vx = -2.5 - Math.random() * 1.5;
      g.vy = -0.3 + (Math.random() - 0.5) * 0.6;
      g.spinSpeed = (Math.random() - 0.5) * 4;
    }
    if (g) {
      g.setScrollFactor(0);   // stay fixed in viewport
      g.setDepth(5000);       // above everything
    }
    return g;
  }

  _stepWeather(time) {
    if (!this.weatherParticles?.length) return;
    const vw = this.scale.gameSize.width;
    const vh = this.scale.gameSize.height;
    for (const p of this.weatherParticles) {
      if (!p) continue;
      // Soft sway for snow/petals
      if (p.swayPhase !== undefined) {
        p.x += Math.sin((time / 600) + p.swayPhase) * 0.3;
      }
      if (p.spinSpeed) p.angle += p.spinSpeed;
      p.x += p.vx;
      p.y += p.vy;
      // Wrap
      if (p.y > vh + 30) { p.y = -30 - Math.random() * 40; p.x = Math.random() * vw; }
      if (p.y < -60)     { p.y = vh + 10;                  p.x = Math.random() * vw; }
      if (p.x < -30)     { p.x = vw + 30;                  p.y = Math.random() * vh; }
      if (p.x > vw + 30) { p.x = -30;                      p.y = Math.random() * vh; }
    }
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.stepAnimal(this.catState, this.catSprite, 20, [170, 770], [300, 1000], dt);
    this._stepWeather(time);
  }
}

// ── React wrapper ─────────────────────────────────────────────────────────────
export function GardenWorld({ vpRef, pressed, setPressed, plantedSeeds = [], planting, moving, onPlantAt, onMoveTo }) {
  const containerRef    = useRef(null);
  const gameRef         = useRef(null);
  const propsRef        = useRef({ plantedSeeds, pressed, planting, moving });
  const callbacksRef    = useRef({ setPressed, onPlantAt, onMoveTo });

  // Keep refs current every render so scene always reads latest values
  propsRef.current   = { plantedSeeds, pressed, planting, moving };
  callbacksRef.current = { setPressed, onPlantAt, onMoveTo };

  // Propagate React state changes to the running scene
  useEffect(() => {
    const scene = gameRef.current?.registry?.get("scene");
    if (scene?.sys?.isActive?.()) {
      scene.updateFromProps(propsRef.current);
    }
  }, [plantedSeeds, pressed]);

  // Create Phaser game once, but only after all theme fonts are loaded.
  // Canvas text never retries a failed font lookup, so we must guarantee
  // every typeface is in the browser's font cache before the first render.
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    Promise.all(
      THEME_FONT_NAMES.map(f => document.fonts.load(`14px "${f}"`).catch(() => {}))
    ).then(() => {
      if (destroyed || !containerRef.current) return;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: "#87d4f5",
        pixelArt: true,
        roundPixels: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.NO_CENTER,
          width: "100%",
          height: "100%",
        },
        scene: [GardenScene],
      });

      // Pass refs into the scene via registry (set before scene create() runs)
      game.registry.set("propsRef", propsRef);
      game.registry.set("callbacksRef", callbacksRef);
      game.registry.set("vpRef", vpRef);

      gameRef.current = game;
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.registry.set("scene", null);
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0 }}
    />
  );
}
