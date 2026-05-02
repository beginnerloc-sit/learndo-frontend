import { useState } from "react";
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
  fill_blank: "Fill in the blank",
  synonym:    "Which word means the same?",
  antonym:    "Which word means the opposite?",
};

export function buildQuiz(data) {
  const options = shuffle([
    { label: data.correct, correct: true },
    ...data.distractors.map(d => ({ label: d, correct: false })),
  ]);
  return { ...data, options };
}

export function QuizModal({ quiz, onClose, onWin }) {
  const [picked, setPicked] = useState(null);
  const isFillBlank = quiz.quiz_type === "fill_blank";
  const theme = wordTheme(quiz.word);
  const prompt = QUIZ_PROMPTS[quiz.quiz_type] ?? "What does this mean?";

  function handlePick(i) {
    if (picked !== null) return;
    setPicked(i);
    if (quiz.options[i].correct) {
      setTimeout(() => onWin(quiz.word, quiz.lang), 600);
    }
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
              {quiz.ipa && <div className="quiz-ipa">/{quiz.ipa}/</div>}
            </>
          )}
        </div>

        <div className="quiz-options">
          {quiz.options.map((opt, i) => {
            const cls = picked == null ? "" : opt.correct ? "right" : i === picked ? "wrong" : "dim";
            return (
              <button key={i} className={`quiz-opt ${cls}`} disabled={picked != null} onClick={() => handlePick(i)}>
                {opt.label}
              </button>
            );
          })}
        </div>

        {picked != null && !quiz.options[picked].correct && (
          <div className="quiz-foot">
            <div className="msg wrong">Not quite…</div>
            <button className="hd-btn" onClick={onClose}>TRY AGAIN</button>
          </div>
        )}
        {picked != null && quiz.options[picked].correct && (
          <div className="quiz-foot">
            <div className="msg right">{isFillBlank ? "Correct! 💧" : "Nice! Planting now →"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
