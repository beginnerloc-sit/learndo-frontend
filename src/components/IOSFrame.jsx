export function IOSStatusBar({ dark = false, time = "9:41" }) {
  const c = dark ? "#fff" : "#000";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "21px 24px 0", position: "relative", zIndex: 20, width: "100%", boxSizing: "border-box" }}>
      <span style={{ fontFamily: '-apple-system,"SF Pro",system-ui', fontWeight: 590, fontSize: 17, color: c }}>{time}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {/* signal */}
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c}/>
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c}/>
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c}/>
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c}/>
        </svg>
        {/* wifi */}
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill={c}/>
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill={c}/>
          <circle cx="8.5" cy="10.5" r="1.5" fill={c}/>
        </svg>
        {/* battery */}
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none"/>
          <rect x="2" y="2" width="20" height="9" rx="2" fill={c}/>
          <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill={c} fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

export function IOSGlassPill({ children, dark = false, style = {} }) {
  return (
    <div style={{ height: 44, minWidth: 44, borderRadius: 9999, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: dark ? "0 2px 6px rgba(0,0,0,0.35)" : "0 1px 3px rgba(0,0,0,0.07)", ...style }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 9999, backdropFilter: "blur(12px) saturate(180%)", WebkitBackdropFilter: "blur(12px) saturate(180%)", background: dark ? "rgba(120,120,128,0.28)" : "rgba(255,255,255,0.5)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 9999, boxShadow: "inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)", border: "0.5px solid rgba(0,0,0,0.06)" }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", padding: "0 4px" }}>{children}</div>
    </div>
  );
}

export function IOSDevice({ children, dark = false }) {
  const W = 393, H = 852;
  return (
    <div style={{ width: W, height: H, borderRadius: 48, overflow: "hidden", position: "relative", background: dark ? "#000" : "#F2F2F7", boxShadow: "0 40px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.14)", fontFamily: "-apple-system,system-ui,sans-serif", WebkitFontSmoothing: "antialiased", flexShrink: 0 }}>
      {/* dynamic island */}
      <div style={{ position: "absolute", top: 11, left: "50%", transform: "translateX(-50%)", width: 126, height: 37, borderRadius: 24, background: "#000", zIndex: 50 }} />
      {/* content */}
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      {/* home indicator */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 60, height: 34, display: "flex", justifyContent: "center", alignItems: "flex-end", paddingBottom: 8, pointerEvents: "none" }}>
        <div style={{ width: 139, height: 5, borderRadius: 100, background: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.25)" }} />
      </div>
    </div>
  );
}
