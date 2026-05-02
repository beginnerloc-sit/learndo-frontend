const STAGE_ASSETS = ["00-empty.svg", "01-seed.svg", "02-sprout.svg", "03-sapling.svg", "04-bloom.svg", "04-bloom.svg"];

export function WordCard({ word, ipa, gloss, lang, stage = 5, reviews }) {
  const assetName = STAGE_ASSETS[stage] ?? "04-bloom.svg";

  return (
    <div style={{
      background: "var(--cream-100)",
      border: "1px solid var(--border-soft)",
      borderRadius: 20,
      padding: 18,
      boxShadow: "var(--shadow-leaf)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <img src={`/assets/plants/${assetName}`} width={56} height={56} alt={word} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--moss-800)", lineHeight: 1 }}>
            {word}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--soil-400)", marginTop: 4 }}>
            {ipa}
          </div>
          <div style={{ fontSize: 14, color: "var(--soil-500)", marginTop: 4 }}>{gloss}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--moss-700)", fontWeight: 600 }}>{reviews} reviews</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--moss-100)", color: "var(--moss-800)" }}>
          {lang}
        </span>
      </div>
    </div>
  );
}
