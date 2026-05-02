import { NavLink } from "react-router-dom";
import { Sprout, BookOpen, Users, Trophy, Settings } from "lucide-react";

const NAV = [
  { to: "/",            label: "Garden",      Icon: Sprout   },
  { to: "/lesson",      label: "Practice",    Icon: BookOpen },
  { to: "/visit",       label: "Visit",       Icon: Users    },
  { to: "/leaderboard", label: "Leaderboard", Icon: Trophy   },
  { to: "/settings",    label: "Settings",    Icon: Settings },
];

export function Sidebar() {
  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      borderRight: "1px solid var(--border-soft)",
      background: "var(--cream-100)",
      padding: "24px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 24px" }}>
        <Sprout size={28} color="var(--moss-600)" strokeWidth={2} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--moss-700)", letterSpacing: "-0.02em" }}>
          learndo
        </span>
      </div>

      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 12,
            textDecoration: "none",
            fontFamily: "var(--font-body)",
            fontSize: 15,
            fontWeight: 600,
            background: isActive ? "var(--moss-100)" : "transparent",
            color: isActive ? "var(--moss-800)" : "var(--soil-600)",
            transition: "all 200ms",
          })}
        >
          <Icon size={20} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}

      <div style={{ flex: 1 }} />

      <div style={{ background: "var(--moss-50)", border: "1px solid var(--moss-100)", borderRadius: 16, padding: 14, marginTop: 12 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--moss-800)" }}>Slow growth</div>
        <div style={{ fontSize: 13, color: "var(--soil-500)", marginTop: 2 }}>is real growth.</div>
      </div>
    </aside>
  );
}
