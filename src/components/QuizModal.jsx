import { useLayoutEffect, useRef, useState } from "react";
import { wordTheme } from "../utils/wordTheme";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const QUIZ_PROMPTS = {
  meaning:    "What does this mean?",
  rearrange:  "Arrange the words to form a sentence",
  fill_blank: "Which meaning fits the blank?",  // legacy
  synonym:    "Which word means the same?",
  antonym:    "Which word means the opposite?",
};

export function buildQuiz(data) {
  if (data.quiz_type === "rearrange") {
    // Build a token bank from correct tokens + distractors, then shuffle
    const correctTokens = data.correct_tokens || data.correct.split(/\s+/).filter(Boolean);
    const allTokens = shuffle([
      ...correctTokens.map((label, idx) => ({ id: `c${idx}`, label, fromCorrect: true })),
      ...(data.distractors || []).map((label, idx) => ({ id: `d${idx}`, label, fromCorrect: false })),
    ]);
    return { ...data, correct_tokens: correctTokens, bank: allTokens };
  }
  const options = shuffle([
    { label: data.correct, correct: true },
    ...data.distractors.map(d => ({ label: d, correct: false })),
  ]);
  return { ...data, options };
}

function MultipleChoiceQuiz({ quiz, picked, onPick, isFillBlank }) {
  const theme = wordTheme(quiz.word);
  const prompt = QUIZ_PROMPTS[quiz.quiz_type] ?? "What does this mean?";
  return (
    <>
      <div className="quiz-prompt">
        {isFillBlank ? (
          <>
            <div className="quiz-label">{prompt}</div>
            <div className="quiz-sentence">{quiz.question}</div>
          </>
        ) : (
          <>
            <div className="quiz-label">{prompt}</div>
            <div className="quiz-word" style={{ fontFamily: theme.fontFamily, color: theme.color, fontStyle: theme.fontStyle, fontWeight: theme.fontWeight, letterSpacing: theme.letterSpacing }}>{quiz.word}</div>
            {quiz.ipa && <div className="quiz-ipa">{quiz.ipa}</div>}
          </>
        )}
      </div>

      <div className="quiz-options">
        {quiz.options.map((opt, i) => {
          const cls = picked == null ? "" : opt.correct ? "right" : i === picked ? "wrong" : "dim";
          return (
            <button key={i} className={`quiz-opt ${cls}`} disabled={picked != null} onClick={() => onPick(i)}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

function RearrangeQuiz({ quiz, onResult }) {
  const [chosen, setChosen]   = useState([]);          // tokens in the answer area (ordered)
  const [bank, setBank]       = useState(() => quiz.bank);
  const [verdict, setVerdict] = useState(null);        // "right" | "wrong" | null
  const [drag, setDrag]       = useState(null);
    // drag = { chip, source: "bank"|"answer", x, y, w, h, offX, offY, dropZone, dropIndex }

  const answerRef = useRef(null);
  const bankRef   = useRef(null);
  const [answerMinH, setAnswerMinH] = useState(0);
  const [bankMinH,   setBankMinH]   = useState(0);
  const correctTokens = quiz.correct_tokens;
  const ready = chosen.length >= correctTokens.length;

  // Lock each box at the largest height it has ever needed, so removing chips
  // never shrinks the container.
  useLayoutEffect(() => {
    if (answerRef.current) {
      const h = answerRef.current.getBoundingClientRect().height;
      setAnswerMinH(prev => Math.max(prev, h));
    }
    if (bankRef.current) {
      const h = bankRef.current.getBoundingClientRect().height;
      setBankMinH(prev => Math.max(prev, h));
    }
  }, [chosen, bank]);

  const startDrag = (chip, source) => (e) => {
    if (verdict || !e.isPrimary) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture?.(e.pointerId);
    const rect = el.getBoundingClientRect();
    setDrag({
      chip, source,
      offX: e.clientX - rect.left,
      offY: e.clientY - rect.top,
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
      dropZone: null,
      dropIndex: -1,
    });
  };

  const onMove = (e) => {
    if (!drag) return;
    e.preventDefault();
    const x = e.clientX - drag.offX;
    const y = e.clientY - drag.offY;
    let zone = null;
    let dropIndex = -1;

    const ar = answerRef.current?.getBoundingClientRect();
    const br = bankRef.current?.getBoundingClientRect();
    const cx = e.clientX, cy = e.clientY;

    if (ar && cx >= ar.left && cx <= ar.right && cy >= ar.top && cy <= ar.bottom) {
      zone = "answer";
      // Find insertion index by checking each chip's center
      const chips = Array.from(answerRef.current.querySelectorAll(".sent-chip:not(.placeholder-chip)"));
      dropIndex = chips.length;
      for (let i = 0; i < chips.length; i++) {
        const r = chips[i].getBoundingClientRect();
        const isSameRow = cy >= r.top && cy <= r.bottom;
        if (isSameRow && cx < r.left + r.width / 2) { dropIndex = i; break; }
        if (cy < r.top) { dropIndex = i; break; }
      }
    } else if (br && cx >= br.left && cx <= br.right && cy >= br.top && cy <= br.bottom) {
      zone = "bank";
    }

    setDrag(d => d ? { ...d, x, y, dropZone: zone, dropIndex } : d);
  };

  const onEnd = () => {
    if (!drag) return;
    const { chip, source, dropZone, dropIndex } = drag;

    if (dropZone === "answer") {
      // Move (or reorder) chip into answer at dropIndex
      if (source === "bank") {
        setBank(b => b.filter(c => c.id !== chip.id));
        setChosen(c => {
          const idx = dropIndex < 0 ? c.length : Math.min(dropIndex, c.length);
          return [...c.slice(0, idx), chip, ...c.slice(idx)];
        });
      } else {
        // reorder within answer
        setChosen(c => {
          const without = c.filter(x => x.id !== chip.id);
          const oldIdx = c.findIndex(x => x.id === chip.id);
          let idx = dropIndex < 0 ? without.length : dropIndex;
          if (oldIdx >= 0 && oldIdx < idx) idx -= 1; // account for our removed self
          idx = Math.max(0, Math.min(idx, without.length));
          return [...without.slice(0, idx), chip, ...without.slice(idx)];
        });
      }
    } else if (dropZone === "bank") {
      if (source === "answer") {
        setChosen(c => c.filter(x => x.id !== chip.id));
        setBank(b => [...b, chip]);
      }
      // If source was bank → snap back, no change
    }
    // else: dropped outside any zone → snap back, no change
    setDrag(null);
  };

  // Tap-as-fallback for accessibility
  const tapBank = (chip) => {
    if (verdict || drag) return;
    setBank(b => b.filter(c => c.id !== chip.id));
    setChosen(c => [...c, chip]);
  };
  const tapChosen = (chip) => {
    if (verdict || drag) return;
    setChosen(c => c.filter(x => x.id !== chip.id));
    setBank(b => [...b, chip]);
  };

  const reset = () => {
    setBank(quiz.bank);
    setChosen([]);
    setVerdict(null);
  };
  const submit = () => {
    const userTokens = chosen.map(c => c.label.trim());
    const target     = correctTokens.map(t => t.trim());
    const ok = userTokens.length === target.length && userTokens.every((t, i) => t === target[i]);
    setVerdict(ok ? "right" : "wrong");
    onResult(ok);
  };

  return (
    <>
      <div className="quiz-prompt">
        <div className="quiz-label">{QUIZ_PROMPTS.rearrange}</div>
        <div className="quiz-rearrange-meaning">
          "{quiz.question || quiz.gloss}"
        </div>
      </div>

      <div
        ref={answerRef}
        className={[
          "rearrange-answer",
          verdict === "right" ? "right" : "",
          verdict === "wrong" ? "wrong" : "",
          drag?.dropZone === "answer" ? "drop-active" : "",
        ].filter(Boolean).join(" ")}
        style={{ minHeight: answerMinH || 64 }}
        onPointerMove={onMove}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
      >
        {chosen.length === 0 && !drag && <span className="placeholder">Drag or tap words to build the sentence…</span>}
        {chosen.map(chip => {
          const beingDragged = drag?.chip.id === chip.id;
          return (
            <button
              key={chip.id}
              className={`sent-chip in${beingDragged ? " ghost" : ""}`}
              onPointerDown={startDrag(chip, "answer")}
              onClick={() => tapChosen(chip)}
              disabled={!!verdict}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div
        ref={bankRef}
        className={`rearrange-bank${drag?.dropZone === "bank" ? " drop-active" : ""}`}
        style={{ minHeight: bankMinH || 64 }}
        onPointerMove={onMove}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
      >
        {bank.map(chip => {
          const beingDragged = drag?.chip.id === chip.id;
          return (
            <button
              key={chip.id}
              className={`sent-chip${beingDragged ? " ghost" : ""}`}
              onPointerDown={startDrag(chip, "bank")}
              onClick={() => tapBank(chip)}
              disabled={!!verdict}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {drag && (
        <div
          className="sent-chip drag-ghost"
          style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }}
        >
          {drag.chip.label}
        </div>
      )}

      <div className="quiz-foot">
        {!verdict && (
          <button
            className="hd-btn"
            disabled={!ready}
            onClick={submit}
            style={{ width: "100%", opacity: ready ? 1 : 0.5 }}
          >
            CHECK
          </button>
        )}
        {verdict === "right" && <div className="msg right">Nice! 🌱</div>}
        {verdict === "wrong" && (
          <>
            <div className="msg wrong">Not quite — should be: <em>"{correctTokens.join(" ")}"</em></div>
            <button className="hd-btn yellow" onClick={reset}>RETRY</button>
          </>
        )}
      </div>
    </>
  );
}

export function QuizModal({ quiz, onClose, onWin }) {
  const [picked, setPicked] = useState(null);
  const isRearrange  = quiz.quiz_type === "rearrange";
  const isFillBlank  = quiz.quiz_type === "fill_blank";

  function handlePick(i) {
    if (picked !== null) return;
    setPicked(i);
    if (quiz.options[i].correct) {
      setTimeout(() => onWin(quiz.word, quiz.lang), 600);
    }
  }

  function handleRearrangeResult(ok) {
    if (ok) setTimeout(() => onWin(quiz.word, quiz.lang), 800);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="lang-pill" style={{ background: quiz.lang_color || "#5a3e1a" }}>
            {quiz.lang.toUpperCase()}
          </span>
          <button className="x-btn" onClick={onClose}>×</button>
        </div>

        {isRearrange ? (
          <RearrangeQuiz quiz={quiz} onResult={handleRearrangeResult} />
        ) : (
          <MultipleChoiceQuiz quiz={quiz} picked={picked} onPick={handlePick} isFillBlank={isFillBlank} />
        )}

        {!isRearrange && picked != null && !quiz.options[picked].correct && (
          <div className="quiz-foot">
            <div className="msg wrong">Not quite…</div>
            <button className="hd-btn" onClick={onClose}>TRY AGAIN</button>
          </div>
        )}
        {!isRearrange && picked != null && quiz.options[picked].correct && (
          <div className="quiz-foot">
            <div className="msg right">{isFillBlank ? "Correct! 💧" : "Nice! Planting now →"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
