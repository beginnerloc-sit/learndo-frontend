import { useState } from "react";
import { WORD_INFO } from "../api/vocabulary";

const HELPERS = {
  Spanish:  ["es", "una", "muy", "bonita", "la", "yo", "tengo", "y", "el", "está"],
  French:   ["est", "une", "très", "belle", "la", "j'ai", "et", "le", "ici", "rouge"],
  Japanese: ["は", "が", "です", "を", "見ます", "好き", "とても", "きれい", "新しい", "私の"],
  German:   ["ist", "eine", "sehr", "schön", "ich", "habe", "und", "der", "hier", "rot"],
  Italian:  ["è", "una", "molto", "bella", "la", "ho", "e", "il", "qui", "rosso"],
};

export function SentenceBuilder({ watering, onCancel, onSubmit }) {
  const helpers = HELPERS[watering.lang] || [];
  const [chips, setChips] = useState([{ id: "target", label: watering.word, target: true }]);
  const [bank, setBank]   = useState(() => helpers.map((label, i) => ({ id: `h${i}`, label })));
  const info = WORD_INFO[watering.word];
  const valid = chips.length >= 3;

  const moveIn = (chip) => { setBank(b => b.filter(x => x.id !== chip.id)); setChips(c => [...c, chip]); };
  const moveOut = (chip) => { if (chip.target) return; setChips(c => c.filter(x => x.id !== chip.id)); setBank(b => [...b, chip]); };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal sentence" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="lang-pill" style={{ background: info?.langColor || "#5a3e1a" }}>{watering.lang.toUpperCase()}</span>
          <button className="x-btn" onClick={onCancel}>×</button>
        </div>
        <div className="quiz-prompt">
          <div className="quiz-label">Water with a sentence using</div>
          <div className="quiz-word" style={{ fontSize: 22 }}>{watering.word}</div>
        </div>
        <div className="sentence-box">
          {chips.map(chip => (
            <button key={chip.id} className={`sent-chip in ${chip.target ? "target" : ""}`} onClick={() => moveOut(chip)}>{chip.label}</button>
          ))}
          {chips.length < 2 && <span className="placeholder">Tap words below…</span>}
        </div>
        <div className="bank">
          {bank.map(chip => <button key={chip.id} className="sent-chip" onClick={() => moveIn(chip)}>{chip.label}</button>)}
        </div>
        <div className="sentence-foot">
          <span className="hint">{valid ? "Looks good!" : `${3 - chips.length} more word${3 - chips.length === 1 ? "" : "s"}`}</span>
          <button className="hd-btn yellow" disabled={!valid} onClick={onSubmit} style={{ opacity: valid ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6 }}>
            💧 WATER
          </button>
        </div>
      </div>
    </div>
  );
}
