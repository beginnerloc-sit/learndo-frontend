export function StatCard({ label, value, sub, icon, accent }) {
  const accentStyles = {
    streak: { background: "linear-gradient(135deg,#b53a6a,#e87aa3)", color: "white" },
    coins:  { background: "var(--cream-100)", color: "var(--soil-700)", border: "1px solid var(--border-soft)" },
    plants: { background: "var(--cream-100)", color: "var(--soil-700)", border: "1px solid var(--border-soft)" },
    visits: { background: "var(--cream-100)", color: "var(--soil-700)", border: "1px solid var(--border-soft)" },
  };
  const a = accentStyles[accent] || accentStyles.coins;
  const isStreak = accent === "streak";

  return (
    <div style={{ ...a, borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", opacity: isStreak ? 0.85 : 1, color: isStreak ? "white" : "var(--soil-400)" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: isStreak ? "white" : "var(--moss-800)", lineHeight: 1 }}>
          {value}
        </div>
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: isStreak ? "rgba(255,255,255,0.85)" : "var(--moss-600)", fontWeight: 600 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
