export function Button({ variant = "primary", size = "md", children, onClick, icon, disabled, style = {}, ...rest }) {
  const base = {
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    border: "none",
    borderRadius: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 240ms cubic-bezier(0.22,1,0.36,1)",
    minHeight: size === "sm" ? 36 : 48,
    fontSize: size === "sm" ? 14 : 16,
    padding: size === "sm" ? "10px 16px" : "14px 22px",
    whiteSpace: "nowrap",
    lineHeight: 1.2,
    ...style,
  };

  const variants = {
    primary:   { background: "var(--moss-600)", color: "var(--cream-50)", boxShadow: "0 3px 0 var(--moss-800)" },
    secondary: { background: "var(--cream-100)", color: "var(--soil-700)", border: "1.5px solid var(--moss-300)" },
    ghost:     { background: "transparent", color: "var(--moss-700)" },
    bud:       { background: "var(--bud)", color: "var(--soil-700)", boxShadow: "0 3px 0 var(--bud-dk)" },
    danger:    { background: "transparent", color: "#c8453a", border: "1.5px solid #f0c1bb" },
  };

  if (disabled) {
    return (
      <button style={{ ...base, background: "var(--cream-200)", color: "var(--soil-300)", boxShadow: "none" }} disabled {...rest}>
        {icon}{children}
      </button>
    );
  }

  return (
    <button
      style={{ ...base, ...(variants[variant] || variants.primary) }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      {...rest}
    >
      {icon}{children}
    </button>
  );
}
