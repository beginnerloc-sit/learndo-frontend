import { useState } from "react";
import { updateLangPrefs } from "../api/users";

const LANGUAGES = [
  { code: "english",    label: "English",    flag: "🇬🇧" },
  { code: "vietnamese", label: "Vietnamese", flag: "🇻🇳" },
  { code: "japanese",   label: "Japanese",   flag: "🇯🇵" },
  { code: "chinese",    label: "Chinese",    flag: "🇨🇳" },
  { code: "french",     label: "French",     flag: "🇫🇷" },
  { code: "german",     label: "German",     flag: "🇩🇪" },
  { code: "spanish",    label: "Spanish",    flag: "🇪🇸" },
];

export function LangPickerScreen({ initial = [], onDone, canSkip = false }) {
  const [selected, setSelected] = useState(new Set(initial));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (code) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else if (next.size < 3) {
        next.add(code);
      }
      return next;
    });
  };

  const save = async () => {
    if (selected.size === 0) { setError("Pick at least one language."); return; }
    setLoading(true);
    setError("");
    try {
      const user = await updateLangPrefs([...selected]);
      onDone(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scene lang-picker-wrap">
      <div className="lang-picker-card">
        <div className="lang-picker-header">
          <div style={{ fontSize: 40, lineHeight: 1 }}>🌱</div>
          <h2>What do you want to study?</h2>
          <p>Choose up to 3 languages</p>
        </div>

        <div className="lang-picker-grid">
          {LANGUAGES.map(({ code, label, flag }) => {
            const on = selected.has(code);
            const disabled = !on && selected.size >= 3;
            return (
              <button
                key={code}
                className={`lang-option${on ? " selected" : ""}${disabled ? " maxed" : ""}`}
                onClick={() => toggle(code)}
                disabled={disabled}
              >
                <span className="lang-flag">{flag}</span>
                <span className="lang-label">{label}</span>
                {on && <span className="lang-check">✓</span>}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 11, color: "#8a6a3a", fontFamily: "'Lilita One',sans-serif", textAlign: "center" }}>
          {selected.size}/3 selected
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          className="hd-btn"
          onClick={save}
          disabled={loading || selected.size === 0}
          style={{ marginTop: 8, width: "100%" }}
        >
          {loading ? "SAVING…" : "LET'S GO →"}
        </button>

        {canSkip && (
          <button
            className="lang-skip"
            onClick={() => onDone(null)}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
