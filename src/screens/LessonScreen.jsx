import { useState } from "react";
import { X } from "lucide-react";
import { useLessonQueue, useSubmitAnswer } from "../hooks/useLessons";
import { useQueryClient } from "@tanstack/react-query";
import { wordTheme } from "../utils/wordTheme";

export function LessonScreen({ onClose }) {
  const qc = useQueryClient();
  const { data: queue, isLoading, refetch } = useLessonQueue(5);
  const submit = useSubmitAnswer();

  const [index, setIndex]     = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult]   = useState(null);
  const [done, setDone]       = useState(false);

  const question = queue?.[index];
  const answered = question ? answers[question.id] !== undefined : false;
  const picked   = answered ? answers[question.id].picked : null;
  const isRight  = answered && picked === question?.correctIndex;

  async function handlePick(i) {
    if (!question || answered) return;
    const correct = i === question.correctIndex;
    const res = await submit.mutateAsync({ wordId: question.id, correct });
    setResult(res);
    setAnswers(prev => ({ ...prev, [question.id]: { picked: i, correct } }));
  }

  function handleNext() {
    if (index < (queue?.length ?? 0) - 1) { setIndex(i => i + 1); setResult(null); }
    else setDone(true);
  }

  function restart() {
    qc.invalidateQueries({ queryKey: ["lesson", "queue"] });
    refetch();
    setIndex(0); setAnswers({}); setResult(null); setDone(false);
  }

  const progress = queue?.length ? index / queue.length : 0;
  const correct  = Object.values(answers).filter(a => a.correct).length;

  return (
    <div className="lesson">
      <div className="top">
        <button className="x" onClick={onClose}><X size={20} strokeWidth={2.5} /></button>
        <div className="bar">
          <div className="fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <span style={{ fontFamily: "'Lilita One',sans-serif", fontSize: 13, color: "#6e4e2c", letterSpacing: "0.04em" }}>
          {index + 1} / {queue?.length ?? 5}
        </span>
      </div>

      <div className="body">
        {isLoading && <div style={{ margin: "auto", color: "#6e4e2c" }}>Loading…</div>}

        {!isLoading && done && (
          <div style={{ margin: "auto", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
            <div style={{ fontFamily: "'Caprasimo',serif", fontSize: 28, color: "#283e23", lineHeight: 1.1 }}>Session complete!</div>
            <div style={{ fontSize: 14, color: "#6e4e2c", marginTop: 8 }}>{correct} / {Object.keys(answers).length} correct</div>
            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
              <button className="hd-btn" style={{ background: "linear-gradient(180deg,#f3ecdc,#e8dec5)", color: "#3e2a16", borderColor: "#5a3e1a", boxShadow: "0 3px 0 #5a3e1a" }} onClick={onClose}>GARDEN</button>
              <button className="hd-btn" onClick={restart}>AGAIN</button>
            </div>
          </div>
        )}

        {!isLoading && !done && question && (
          <>
            <div className="word-prompt">
              <div className="lbl">Translate · {question.lang} → EN</div>
              <div className="big" style={(() => { const t = wordTheme(question.word, question.lang); return { fontFamily: t.fontFamily, color: t.color, fontStyle: t.fontStyle, fontWeight: t.fontWeight, letterSpacing: t.letterSpacing }; })()}>{question.word}</div>
              {question.ipa && <div className="ipa">{question.ipa}</div>}
            </div>

            <div className="choices">
              {question.choices.map((c, i) => {
                const correct  = answered && i === question.correctIndex;
                const wrong    = answered && i === picked && !isRight;
                return (
                  <button
                    key={i}
                    className={`choice${correct ? " right" : wrong ? " wrong" : ""}`}
                    onClick={() => handlePick(i)}
                    disabled={answered}
                  >
                    {c.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="feedback" style={{ background: isRight ? "#c8e6a8" : "#fbf0d4", borderColor: isRight ? "#2b3f1a" : "#b89260", boxShadow: isRight ? "0 4px 0 #2b3f1a" : "0 4px 0 #b89260" }}>
                <div className="msg">{result?.message ?? (isRight ? "Nice. Plant is growing." : "Not quite — try once more.")}</div>
                <button className="hd-btn" style={isRight ? {} : { background: "linear-gradient(180deg,#ffd96a,#e8a91a)", borderColor: "#6e4e0e", boxShadow: "0 3px 0 #6e4e0e", color: "#4a2f08" }} onClick={handleNext}>
                  {isRight ? "NEXT" : "SKIP"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
