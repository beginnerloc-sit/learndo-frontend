import { useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { useLeaderboard } from "../hooks/useLeaderboard";

export function LeaderboardList({ currentUserId = "u1" }) {
  const navigate = useNavigate();
  const { data: entries, isLoading } = useLeaderboard();

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--soil-400)" }}>Loading…</div>;
  }

  return (
    <div style={{ background: "var(--cream-100)", border: "1px solid var(--border-soft)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-leaf)" }}>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--moss-700)", margin: 0 }}>This week's gardeners</h3>
        <span style={{ fontSize: 13, color: "var(--soil-400)" }}>By plants in bloom</span>
      </div>
      <div>
        {entries?.map((e, i) => {
          const isYou = e.id === currentUserId;
          return (
            <div key={e.id} style={{
              display: "grid",
              gridTemplateColumns: "40px 48px 1fr auto auto",
              gap: 14,
              alignItems: "center",
              padding: "14px 22px",
              borderBottom: i < entries.length - 1 ? "1px solid var(--border-soft)" : "none",
              background: isYou ? "var(--moss-50)" : "transparent",
            }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: i < 3 ? "var(--moss-700)" : "var(--soil-400)" }}>
                {i + 1}
              </span>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: e.avatarColor, color: "white", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
                {e.initials}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--moss-800)" }}>
                  {e.name}
                  {isYou && <span style={{ fontSize: 12, fontFamily: "var(--font-body)", color: "var(--moss-600)", marginLeft: 8 }}>· you</span>}
                </div>
                <div style={{ fontSize: 13, color: "var(--soil-400)" }}>{e.lang} · {e.streak} day streak</div>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--moss-700)", fontWeight: 700 }}>
                🌸 {e.blooms}
              </span>
              {!isYou && (
                <Button variant="secondary" size="sm" onClick={() => navigate(`/visit/${e.id}`)}>
                  Visit
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
