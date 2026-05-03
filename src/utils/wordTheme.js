export function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return h;
}

// 30 themes: {fontFamily, color, fontStyle, fontWeight, letterSpacing?}
// fontWeight "700" = bold; fontStyle "italic" = italic
const THEMES = [
  // ── Reds / Pinks ──
  { fontFamily: "'Caprasimo', serif",         color: "#c1325a", fontStyle: "italic",  fontWeight: "400" },
  { fontFamily: "'Lobster', cursive",          color: "#b53a6a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Abril Fatface', serif",      color: "#8a0f2a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Satisfy', cursive",          color: "#d4267a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Permanent Marker', cursive", color: "#a83a4a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Bangers', cursive",          color: "#c0301a", fontStyle: "normal", fontWeight: "400", letterSpacing: "0.06em" },

  // ── Blues / Teals ──
  { fontFamily: "'Pacifico', cursive",         color: "#1a6b8a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Cinzel', serif",             color: "#1a3466", fontStyle: "normal", fontWeight: "700" },
  { fontFamily: "'Russo One', sans-serif",     color: "#0fa8c0", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Righteous', cursive",        color: "#2176c7", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Fraunces', serif",           color: "#1a4a6a", fontStyle: "italic",  fontWeight: "300" },

  // ── Greens ──
  { fontFamily: "'Fraunces', serif",           color: "#2d6a2d", fontStyle: "normal", fontWeight: "700" },
  { fontFamily: "'Fredoka One', cursive",      color: "#3aab4e", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Bowlby One', sans-serif",    color: "#5a9333", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Indie Flower', cursive",     color: "#1a7a3a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Caveat', cursive",           color: "#2b5e1f", fontStyle: "italic",  fontWeight: "700" },

  // ── Purples ──
  { fontFamily: "'Lilita One', sans-serif",    color: "#5a3e8e", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Shrikhand', serif",          color: "#6a1a4a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Cinzel', serif",             color: "#4a1a8e", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Satisfy', cursive",          color: "#7a2fa0", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Permanent Marker', cursive", color: "#5a1a7a", fontStyle: "normal", fontWeight: "400" },

  // ── Oranges / Ambers ──
  { fontFamily: "'Pacifico', cursive",         color: "#d97a3e", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Lobster', cursive",          color: "#c87800", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Bangers', cursive",          color: "#d4570a", fontStyle: "normal", fontWeight: "400", letterSpacing: "0.06em" },
  { fontFamily: "'Righteous', cursive",        color: "#b85010", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Abril Fatface', serif",      color: "#a07000", fontStyle: "normal", fontWeight: "400" },

  // ── Mixed / crossover ──
  { fontFamily: "'Russo One', sans-serif",     color: "#3a4a6a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Fredoka One', cursive",      color: "#c01a8a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Indie Flower', cursive",     color: "#0fa8c0", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Caveat', cursive",           color: "#8a4a1a", fontStyle: "italic",  fontWeight: "700" },
  { fontFamily: "'Bowlby One', sans-serif",    color: "#5a3e8e", fontStyle: "normal", fontWeight: "400" },
];

// Vietnamese themes — most playful display fonts above lack the Latin Extended
// Additional glyphs Vietnamese needs (e.g. ấ ề ữ ặ), which causes ugly fallback
// rendering. These themes use only fonts with full Vietnamese coverage.
const VIET_THEMES = [
  // Reds / pinks
  { fontFamily: "'Bagel Fat One', cursive",       color: "#c1325a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Mali', cursive",                color: "#b53a6a", fontStyle: "italic", fontWeight: "700" },
  { fontFamily: "'Henny Penny', cursive",         color: "#d4267a", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Be Vietnam Pro', sans-serif",   color: "#a83a4a", fontStyle: "italic", fontWeight: "700" },

  // Blues / teals
  { fontFamily: "'Bungee', cursive",              color: "#1a6b8a", fontStyle: "normal", fontWeight: "400", letterSpacing: "0.04em" },
  { fontFamily: "'Patrick Hand', cursive",        color: "#2176c7", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Fraunces', serif",              color: "#1a3466", fontStyle: "italic", fontWeight: "700" },
  { fontFamily: "'Be Vietnam Pro', sans-serif",   color: "#0fa8c0", fontStyle: "normal", fontWeight: "800" },

  // Greens
  { fontFamily: "'Fredoka', sans-serif",          color: "#3aab4e", fontStyle: "normal", fontWeight: "700" },
  { fontFamily: "'Pangolin', cursive",            color: "#5a9333", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Mali', cursive",                color: "#2b5e1f", fontStyle: "normal", fontWeight: "700" },
  { fontFamily: "'Fraunces', serif",              color: "#2d6a2d", fontStyle: "normal", fontWeight: "800" },

  // Purples
  { fontFamily: "'Bagel Fat One', cursive",       color: "#5a3e8e", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Henny Penny', cursive",         color: "#7a2fa0", fontStyle: "normal", fontWeight: "400" },
  { fontFamily: "'Be Vietnam Pro', sans-serif",   color: "#4a1a8e", fontStyle: "normal", fontWeight: "800" },
  { fontFamily: "'Patrick Hand', cursive",        color: "#6a1a4a", fontStyle: "normal", fontWeight: "400" },

  // Oranges / ambers
  { fontFamily: "'Bungee', cursive",              color: "#d4570a", fontStyle: "normal", fontWeight: "400", letterSpacing: "0.04em" },
  { fontFamily: "'Mali', cursive",                color: "#c87800", fontStyle: "italic", fontWeight: "400" },
  { fontFamily: "'Fredoka', sans-serif",          color: "#d97a3e", fontStyle: "normal", fontWeight: "600" },
  { fontFamily: "'Pangolin', cursive",            color: "#a07000", fontStyle: "normal", fontWeight: "400" },
];

// Vietnamese is detected either explicitly (lang === "vietnamese"/"Vietnamese")
// or by the presence of characters that essentially only occur in Vietnamese.
const VIET_CHAR_RE = /[đĐơƠưƯấầẩẫậắằẳẵặếềểễệốồổỗộớờởỡợứừửữựỳỷỹỵ]/;

function isVietnamese(word, lang) {
  if (lang) {
    const k = String(lang).toLowerCase();
    if (k === "vietnamese" || k === "vi" || k === "vn") return true;
  }
  return VIET_CHAR_RE.test(word || "");
}

export function wordTheme(word, lang) {
  const pool = isVietnamese(word, lang) ? VIET_THEMES : THEMES;
  return pool[strHash(word) % pool.length];
}

// All unique font family names used by either theme pool — preloaded before
// canvas render so Phaser's text rendering doesn't fall back to system fonts.
export const THEME_FONT_NAMES = [
  ...new Set([...THEMES, ...VIET_THEMES].map(t => t.fontFamily.replace(/^'|',.*$/g, ""))),
];

// Phaser-compatible fontStyle string (combines weight + style)
export function phaserFontStyle(theme) {
  const bold   = theme.fontWeight === "700" || theme.fontWeight === "bold";
  const italic = theme.fontStyle === "italic";
  if (bold && italic) return "bold italic";
  if (bold)   return "bold";
  if (italic) return "italic";
  return "normal";
}
