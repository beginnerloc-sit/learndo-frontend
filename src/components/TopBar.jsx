import { Bell } from "lucide-react";
import { useCurrentUser } from "../hooks/useUser";

export function TopBar({ title, subtitle }) {
  const { data: user } = useCurrentUser();

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "24px 32px",
      borderBottom: "1px solid var(--border-soft)",
      background: "var(--cream-50)",
      flexShrink: 0,
    }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--moss-700)", margin: 0, letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        {subtitle && <div style={{ color: "var(--soil-500)", marginTop: 4, fontSize: 16 }}>{subtitle}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {user && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "linear-gradient(135deg,#b53a6a,#e87aa3)", borderRadius: 999, color: "white", fontWeight: 700, fontSize: 14 }}>
              🔥 {user.streak}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--cream-100)", border: "1px solid var(--border-soft)", borderRadius: 999, fontWeight: 700, fontSize: 14, color: "var(--soil-700)" }}>
              🪙 {user.coins.toLocaleString()}
            </div>
          </>
        )}
        <button style={{ background: "transparent", border: "none", padding: 8, borderRadius: 999, cursor: "pointer", color: "var(--soil-500)" }}>
          <Bell size={22} strokeWidth={1.75} />
        </button>
        {user && (
          <div style={{ width: 40, height: 40, borderRadius: 999, background: user.avatarColor, color: "white", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
            {user.initials}
          </div>
        )}
      </div>
    </header>
  );
}
