import { useEffect } from "react";

// Calendar-style daily check-in shown on the user's FIRST visit each day.
// Streak count comes from the backend; the past-7-days strip is derived: the
// streak number tells us how many consecutive days the user has visited
// (today inclusive), so we mark that many cells as "completed" backward
// from today and the rest as "missed".
export function DailyCheckinModal({ streak, wasConsecutive, onClose }) {
  // Auto-dismiss after a generous timeout so it's never sticky on inactive sessions
  useEffect(() => {
    const t = setTimeout(onClose, 30_000);
    return () => clearTimeout(t);
  }, [onClose]);

  const days = buildLast7Days(streak);

  const headline = wasConsecutive
    ? streak === 1 ? "Streak started!" : `${streak}-day streak!`
    : "Welcome back!";
  const subline = wasConsecutive
    ? "Come back tomorrow to keep it going."
    : "A fresh streak begins today.";

  return (
    <div className="modal-backdrop daily-checkin-backdrop" onClick={onClose}>
      <div className="modal daily-checkin-modal" onClick={e => e.stopPropagation()}>
        <div className="dc-flame">🔥</div>
        <div className="dc-streak-num">{streak}</div>
        <div className="dc-headline">{headline}</div>
        <div className="dc-sub">{subline}</div>

        <div className="dc-week">
          {days.map(d => (
            <div
              key={d.key}
              className={`dc-day${d.done ? " done" : ""}${d.today ? " today" : ""}`}
              title={d.label}
            >
              <div className="dc-day-label">{d.short}</div>
              <div className="dc-day-mark">
                {d.done ? (d.today ? "🔥" : "✓") : "·"}
              </div>
            </div>
          ))}
        </div>

        <button className="hd-btn yellow" style={{ width: "100%", marginTop: 14 }} onClick={onClose}>
          LET&apos;S GROW! 🌱
        </button>
      </div>
    </div>
  );
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function buildLast7Days(streak) {
  const out = [];
  const now = new Date();
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    const today = offset === 0;
    // The streak counts back from today. offset 0 = today, offset 1 = yesterday, etc.
    // A streak of N means today + (N-1) prior days are completed.
    const done = offset < streak;
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toDateString(),
      short: SHORT_DAYS[d.getDay()],
      today,
      done,
    });
  }
  return out;
}
