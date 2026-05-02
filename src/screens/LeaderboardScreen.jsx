import { ChevronLeft } from "lucide-react";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { useCurrentUser } from "../hooks/useUser";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardScreen({ onClose, onVisit }) {
  const { data: entries = [], isLoading } = useLeaderboard();
  const { data: me } = useCurrentUser();

  return (
    <div className="lb-screen">
      <div className="lb-header">
        <button className="icon-btn" onClick={onClose}>
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <div className="sign" style={{ flex: 1, textAlign: "center" }}>
          <h1>🌸 Hall of Gardeners</h1>
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div className="lb-list">
        {isLoading && <div className="lb-empty">Loading…</div>}

        {!isLoading && entries.length === 0 && (
          <div className="lb-empty">
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
            No harvests yet — be the first!
          </div>
        )}

        {entries.map((e, i) => {
          const isYou = e.id === me?.id;
          const isTop3 = i < 3;
          return (
            <div
              key={e.id}
              className={`lb-row${isYou ? " you" : ""}${isTop3 ? " top" : ""}`}
              onClick={() => !isYou && onVisit(e)}
            >
              <div className="lb-rank">
                {isTop3 ? MEDALS[i] : <span className="lb-rank-num">{i + 1}</span>}
              </div>
              <div className="lb-avatar" style={{ background: e.avatarColor }}>
                {e.initials}
              </div>
              <div className="lb-info">
                <div className="lb-name">
                  {e.name}
                  {isYou && <span className="lb-you-tag">YOU</span>}
                </div>
                <div className="lb-streak">🔥 {e.streak}d streak</div>
              </div>
              <div className="lb-score">
                <div className="lb-bloom-count">🌸 {e.blooms}</div>
                {!isYou && <div className="lb-visit-hint">visit →</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
