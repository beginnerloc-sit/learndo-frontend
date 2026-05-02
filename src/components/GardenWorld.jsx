import Phaser from "phaser";
import { useRef, useEffect } from "react";
import { wordTheme, phaserFontStyle, THEME_FONT_NAMES } from "../utils/wordTheme";

export const WORLD = { w: 900, h: 1200 };

// SVG ↔ Phaser world coordinate conversion
// The old SVG viewBox was "-450 -100 900 1200"; Phaser world is 0,0→900,1200
const SVG_TO_PH = (x, y) => ({ x: x + 450, y: y + 100 });

function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function makeLcg(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ── Sprite palettes ─────────────────────────────────────────────────────────
const SMALL_SPRITES = [
  "f7-blue", "f7-pink", "f7-purple", "f7-orange",
  "f9-orange", "f9-purple", "f9-red", "f9-yellow",
];
const MED_SPRITES = [
  "f1-blue", "f1-red", "f1-yellow", "f1-teal",
  "f3-blue", "f3-pink", "f3-purple",
  "f6-blue", "f6-orange", "f6-pink", "f6-purple",
];
const POT_SPRITES = [
  "pot1-red", "pot1-blue", "pot1-green",
  "pot2-colorful", "pot2-pink", "pot2-purple", "pot2-red", "pot2-yellow",
  "pot3-colorful", "pot3-purple", "pot3-red",
  "pot4-colorful", "pot4-yellow",
  "pot5-colorful", "pot5-lilac", "pot5-pink", "pot5-purple", "pot5-red",
  "pot6-colorful", "pot6-orange", "pot6-purple", "pot6-red",
  "pot7-colorful", "pot7-yellow",
];

function spriteForStage(styleIdx, stage) {
  if (stage === 0) return "empty-pot";
  if (stage <= 2)  return SMALL_SPRITES[styleIdx % SMALL_SPRITES.length];
  if (stage <= 4)  return MED_SPRITES[styleIdx % MED_SPRITES.length];
  return POT_SPRITES[styleIdx % POT_SPRITES.length];
}

function scaleForStage(stage) {
  return [1.25, 1.25, 1.5, 1.5, 1.875, 1.875][stage] ?? 1.875;
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
    const g = "/assets/garden/", t = "/assets/tiles/";
    this.load.image("empty-pot", g + "empty-pot.png");
    [...SMALL_SPRITES, ...MED_SPRITES, ...POT_SPRITES].forEach(k =>
      this.load.image(k, g + k + ".png")
    );
    // Terrain trees spritesheet — 16×16 px per frame, 15 cols × 13 rows
    this.load.spritesheet("terrain-trees", t + "terrain-trees.png", { frameWidth: 16, frameHeight: 16 });


    // Pet spritesheets — 4×4 grid, 64×64 per frame
    const p = "/assets/pets/";
    this.load.spritesheet("pets-walk", p + "Root_Walk.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("pets-idle", p + "Root_Idle.png", { frameWidth: 64, frameHeight: 64 });

    // Terrain tilesets — 16×16 px per tile
    this.load.spritesheet("ts-grass", t + "grass_tileset.png",     { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-dirt",  t + "dirt_path_tileset.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ts-water", t + "water_tileset.png",     { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    const reg = this.game.registry;
    this.propsRef     = reg.get("propsRef");
    this.callbacksRef = reg.get("callbacksRef");
    this.vpRef        = reg.get("vpRef");

    this.plantLayer   = this.add.layer();
    this.plantClicked = false;

    this.drawGround();
    this.addTrees();
    this.addAnimals();
    this.setupCamera();
    this.setupInput();

    // Register scene so React can call updateFromProps
    reg.set("scene", this);

    // Initial render + cam event after first layout tick
    this.time.delayedCall(50, () => {
      this.updateFromProps(this.propsRef.current);
      this.emitCam();
    });

    this.scale.on("resize", () => this.emitCam());
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

    // Vignette overlay
    const vg = this.add.graphics().setDepth(-1000);
    vg.fillGradientStyle(0x1c3010, 0x1c3010, 0x1c3010, 0x1c3010, 0, 0, 0, 0.2);
    vg.fillRect(0, 0, WORLD.w, WORLD.h);
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
        this.add.image(wx + dc * TW, wy + dr * TW, "terrain-trees", frame)
          .setScale(TSC).setOrigin(0, 0).setDepth(depth);
      });
    };

    // Placed at world edges, clear of path, pond (x640-830,y190-380), patio (x450-770,y510-700)
    [
      { x:   5, y:   5, def: TREE_C },
      { x: 750, y:  10, def: TREE_A },
      { x:   5, y: 450, def: TREE_A },
      { x: 750, y: 420, def: TREE_C },
      { x:   5, y: 870, def: TREE_B },
      { x: 750, y: 900, def: TREE_B },
      { x: 300, y:1050, def: TREE_A },
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
    let drag = null, hasMoved = false;

    this.input.on("pointerdown", (p) => {
      drag = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY };
      hasMoved = false;
      this.plantClicked = false;
    });

    this.input.on("pointermove", (p) => {
      if (!drag) return;
      const dx = p.x - drag.x, dy = p.y - drag.y;
      if (Math.hypot(dx, dy) > 4) hasMoved = true;
      cam.setScroll(drag.sx - dx, drag.sy - dy);
      this.emitCam();
    });

    this.input.on("pointerup", (p) => {
      const wasPlantClick = this.plantClicked;
      this.plantClicked = false;
      if (drag && !hasMoved && !wasPlantClick) {
        if (this.propsRef.current.planting) {
          const wx = p.x + cam.scrollX - 450;
          const wy = p.y + cam.scrollY - 100;
          this.callbacksRef.current.onPlantAt?.(wx, wy);
        } else {
          this.callbacksRef.current.setPressed?.(null);
        }
      }
      drag = null;
    });

    this.input.on("pointercancel", () => { drag = null; });
  }

  // ── Plants ────────────────────────────────────────────────────────────────
  updateFromProps({ plantedSeeds = [], pressed }) {
    this.plantLayer.removeAll(true);

    const all = [...plantedSeeds].sort((a, b) => a.y - b.y);

    all.forEach(f => this.addPlant(f, pressed));
  }

  addPlant(f, pressed) {
    const { x: px, y: py } = SVG_TO_PH(f.x, f.y);
    const stage = f.stage ?? 5;
    const si    = strHash(f.word) % 100;
    const key   = spriteForStage(si, stage);
    const sc    = scaleForStage(stage);

    const img = this.add.image(0, 0, key)
      .setScale(sc)
      .setOrigin(0.5, 1)
      .setInteractive({ cursor: "pointer" });

    const isSelected = pressed?.word === f.word && pressed?.x === f.x && pressed?.y === f.y;
    if (isSelected) img.setTint(0xffe86a);

    // Word label — sits on the flower head, theme picked by word hash
    const theme = wordTheme(f.word);
    const txt = this.add.text(0, -img.displayHeight * 0.78, f.word, {
      fontFamily: theme.fontFamily,
      fontStyle: phaserFontStyle(theme),
      fontSize: "14px",
      color: theme.color,
      stroke: "#fffde8",
      strokeThickness: 5,
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    // Reaction emoji — single compliment placed right beside the word
    const containerChildren = [img, txt];
    if (f.reactions && f.reactions.length > 0) {
      const emoji = f.reactions[0].emoji;
      const emojiTxt = this.add.text(
        txt.displayWidth / 2 + 2,
        -img.displayHeight * 0.78,
        emoji,
        { fontSize: "12px", resolution: 2 }
      ).setOrigin(0, 0.5);
      containerChildren.push(emojiTxt);
    }

    // Container at base of plant — sway rotates around the pot bottom
    const container = this.add.container(px, py, containerChildren).setDepth(py);

    // Sway — staggered per plant so they're out of phase
    const swayAngle = 2.5 + (si % 10) * 0.3;
    const swayDur   = 1800 + (si % 12) * 180;
    const swayDelay = (si % 20) * 130;
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

  update(time, delta) {
    const dt = delta / 1000;
    this.stepAnimal(this.catState, this.catSprite, 20, [170, 770], [300, 1000], dt);
  }
}

// ── React wrapper ─────────────────────────────────────────────────────────────
export function GardenWorld({ vpRef, pressed, setPressed, plantedSeeds = [], planting, onPlantAt }) {
  const containerRef    = useRef(null);
  const gameRef         = useRef(null);
  const propsRef        = useRef({ plantedSeeds, pressed, planting });
  const callbacksRef    = useRef({ setPressed, onPlantAt });

  // Keep refs current every render so scene always reads latest values
  propsRef.current   = { plantedSeeds, pressed, planting };
  callbacksRef.current = { setPressed, onPlantAt };

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
