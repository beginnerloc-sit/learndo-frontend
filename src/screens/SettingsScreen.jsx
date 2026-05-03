import { useState } from "react";
import { ChevronLeft, Music, VolumeX, LogOut } from "lucide-react";
import { updateSettings } from "../api/users";

const LANGUAGES = [
  { code: "english",    label: "English",    flag: "🇬🇧" },
  { code: "vietnamese", label: "Vietnamese", flag: "🇻🇳" },
  { code: "japanese",   label: "Japanese",   flag: "🇯🇵" },
  { code: "chinese",    label: "Chinese",    flag: "🇨🇳" },
  { code: "french",     label: "French",     flag: "🇫🇷" },
  { code: "german",     label: "German",     flag: "🇩🇪" },
  { code: "spanish",    label: "Spanish",    flag: "🇪🇸" },
];

const VOCAB_LEVELS = [
  { code: "beginner",     label: "Beginner",     emoji: "🌱", hint: "Simple everyday words" },
  { code: "intermediate", label: "Intermediate", emoji: "🌿", hint: "Common words in daily life" },
  { code: "advanced",     label: "Advanced",     emoji: "🌳", hint: "Nuanced, less-common words" },
];

const TOPICS = [
  { code: "nature",       label: "Nature",       emoji: "🌲" },
  { code: "food",         label: "Food",         emoji: "🍜" },
  { code: "emotion",      label: "Emotion",      emoji: "💭" },
  { code: "science",      label: "Science",      emoji: "🔬" },
  { code: "music",        label: "Music",        emoji: "🎵" },
  { code: "architecture", label: "Architecture", emoji: "🏛️" },
  { code: "geography",    label: "Geography",    emoji: "🗺️" },
  { code: "sport",        label: "Sport",        emoji: "⚽" },
  { code: "technology",   label: "Technology",   emoji: "💻" },
  { code: "philosophy",   label: "Philosophy",   emoji: "🧠" },
  { code: "medicine",     label: "Medicine",     emoji: "💊" },
  { code: "art",          label: "Art",          emoji: "🎨" },
  { code: "mythology",    label: "Mythology",    emoji: "🐉" },
  { code: "law",          label: "Law",          emoji: "⚖️" },
  { code: "economics",    label: "Economics",    emoji: "💰" },
  { code: "literature",   label: "Literature",   emoji: "📚" },
  { code: "astronomy",    label: "Astronomy",    emoji: "🌌" },
  { code: "cooking",      label: "Cooking",      emoji: "👩‍🍳" },
];

export function SettingsScreen({ initial = {}, onDone, canSkip = false, musicPlaying = false, onToggleMusic, onLogout }) {
  const [studyLangs, setStudyLangs] = useState(new Set(initial.langPrefs ?? []));
  const [vocabLevel, setVocabLevel] = useState(initial.vocabLevel ?? "");
  const [topicPrefs, setTopicPrefs] = useState(new Set(initial.topicPrefs ?? []));
  const [definitionLang, setDefinitionLang] = useState(initial.definitionLang ?? "english");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleStudy = (code) => setStudyLangs(prev => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code);
    else if (next.size < 3) next.add(code);
    return next;
  });

  const toggleTopic = (code) => setTopicPrefs(prev => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code);
    else if (next.size < 6) next.add(code);
    return next;
  });

  const save = async () => {
    if (studyLangs.size === 0) { setError("Pick at least one language to study."); return; }
    if (!vocabLevel) { setError("Pick a vocab level."); return; }
    setLoading(true); setError("");
    try {
      const user = await updateSettings({
        langs: [...studyLangs],
        vocabLevel,
        topicPrefs: [...topicPrefs],
        definitionLang,
      });
      onDone(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-screen">
      <div className="settings-header">
        {canSkip && (
          <button className="icon-btn" onClick={() => onDone(null)} title="Back">
            <ChevronLeft size={15} strokeWidth={2.5} />
          </button>
        )}
        <div className="sign" style={{ flex: 1, textAlign: "center" }}>
          <h1>⚙️ Settings</h1>
        </div>
        {canSkip && <div style={{ width: 30 }} />}
      </div>

      <div className="settings-body">
        {/* ── Studying languages ── */}
        <section className="settings-section">
          <h3>Studying</h3>
          <p className="hint">Up to 3 languages</p>
          <div className="settings-grid two-col">
            {LANGUAGES.map(({ code, label, flag }) => {
              const on = studyLangs.has(code);
              const disabled = !on && studyLangs.size >= 3;
              return (
                <button
                  key={code}
                  className={`settings-option${on ? " selected" : ""}${disabled ? " maxed" : ""}`}
                  onClick={() => toggleStudy(code)}
                  disabled={disabled}
                >
                  <span className="opt-emoji">{flag}</span>
                  <span className="opt-label">{label}</span>
                  {on && <span className="opt-check">✓</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Definition language ── */}
        <section className="settings-section">
          <h3>Definitions in</h3>
          <p className="hint">Word meanings will be shown in this language</p>
          <div className="settings-grid two-col">
            {LANGUAGES.map(({ code, label, flag }) => (
              <button
                key={code}
                className={`settings-option${definitionLang === code ? " selected" : ""}`}
                onClick={() => setDefinitionLang(code)}
              >
                <span className="opt-emoji">{flag}</span>
                <span className="opt-label">{label}</span>
                {definitionLang === code && <span className="opt-check">✓</span>}
              </button>
            ))}
          </div>
        </section>

        {/* ── Vocab level ── */}
        <section className="settings-section">
          <h3>Vocab level</h3>
          <p className="hint">Difficulty of new words you'll see</p>
          <div className="settings-grid">
            {VOCAB_LEVELS.map(({ code, label, emoji, hint }) => (
              <button
                key={code}
                className={`settings-option level${vocabLevel === code ? " selected" : ""}`}
                onClick={() => setVocabLevel(code)}
              >
                <span className="opt-emoji big">{emoji}</span>
                <span className="opt-stack">
                  <span className="opt-label">{label}</span>
                  <span className="opt-hint">{hint}</span>
                </span>
                {vocabLevel === code && <span className="opt-check">✓</span>}
              </button>
            ))}
          </div>
        </section>

        {/* ── Topics ── */}
        <section className="settings-section">
          <h3>Favorite topics</h3>
          <p className="hint">Up to 6 — leave empty to get a mix of everything</p>
          <div className="settings-grid three-col">
            {TOPICS.map(({ code, label, emoji }) => {
              const on = topicPrefs.has(code);
              const disabled = !on && topicPrefs.size >= 6;
              return (
                <button
                  key={code}
                  className={`settings-option topic${on ? " selected" : ""}${disabled ? " maxed" : ""}`}
                  onClick={() => toggleTopic(code)}
                  disabled={disabled}
                >
                  <span className="opt-emoji">{emoji}</span>
                  <span className="opt-label">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {error && <div className="auth-error">{error}</div>}

        <button
          className="hd-btn"
          onClick={save}
          disabled={loading}
          style={{ marginTop: 8, width: "100%" }}
        >
          {loading ? "SAVING…" : (canSkip ? "SAVE" : "LET'S GO →")}
        </button>

        {/* Music + Logout — only available after first-time setup */}
        {canSkip && (
          <>
            <section className="settings-section">
              <h3>Music</h3>
              <button
                className={`settings-toggle-row${musicPlaying ? " on" : ""}`}
                onClick={onToggleMusic}
              >
                <span className="settings-toggle-icon">
                  {musicPlaying ? <Music size={18} strokeWidth={2.5} /> : <VolumeX size={18} strokeWidth={2.5} />}
                </span>
                <span className="settings-toggle-label">
                  Background music is <b>{musicPlaying ? "ON" : "OFF"}</b>
                </span>
                <span className={`settings-toggle-pill${musicPlaying ? " on" : ""}`}>
                  <span className="settings-toggle-knob" />
                </span>
              </button>
            </section>

            <section className="settings-section">
              <h3>Account</h3>
              <button
                className="settings-toggle-row danger"
                onClick={() => {
                  if (confirm("Log out of Learndo?")) onLogout?.();
                }}
              >
                <span className="settings-toggle-icon"><LogOut size={18} strokeWidth={2.5} /></span>
                <span className="settings-toggle-label"><b>Log out</b></span>
                <span className="settings-toggle-arrow">›</span>
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
