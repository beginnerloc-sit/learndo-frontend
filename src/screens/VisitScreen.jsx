import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, BookOpen } from "lucide-react";
import { GardenWorld } from "../components/GardenWorld";
import { QuizModal, buildQuiz } from "../components/QuizModal";
import { GiftPickerPanel } from "../components/GiftPickerPanel";
import { CollectionPanel } from "../components/CollectionPanel";
import { useVocabulary } from "../hooks/useVocabulary";
import { fetchWordQuiz } from "../api/vocabulary";
import { reactToPlant } from "../api/leaderboard";

const REACTION_EMOJIS = ["🌸", "💧", "✨", "🌟", "💕", "🌈"];

export function VisitScreen({ friend, onClose, onTranslateWin }) {
  const vpRef = useRef(null);
  const initialized = useRef(false);

  const [cam, setCam] = useState({ x: -260, y: -50, vw: 360, vh: 460 });
  const [pressed, setPressed] = useState(null);
  const [plantedSeeds, setPlantedSeeds] = useState([]);
  const [visitQuiz, setVisitQuiz] = useState(null);
  const [quizTarget, setQuizTarget] = useState(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showCollection, setShowCollection] = useState(false);

  const { data: gardenPlants } = useVocabulary(friend?.id);

  useEffect(() => {
    if (gardenPlants && !initialized.current) {
      initialized.current = true;
      setPlantedSeeds(gardenPlants);
    }
  }, [gardenPlants]);

  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const handler = (e) => setCam(e.detail);
    el.addEventListener("cam", handler);
    return () => el.removeEventListener("cam", handler);
  }, []);

  const name = friend?.name ?? "Friend";

  const pressedSeed = pressed
    ? plantedSeeds.find(s => s.word === pressed.word && s.x === pressed.x && s.y === pressed.y)
    : null;

  const handleTranslate = useCallback(async () => {
    if (!pressedSeed || translateLoading) return;
    setTranslateLoading(true);
    try {
      const data = await fetchWordQuiz(pressedSeed.word, 0);
      setQuizTarget({ word: pressedSeed.word, lang: pressedSeed.lang });
      setVisitQuiz(buildQuiz(data));
    } catch {
      // silently fail
    } finally {
      setTranslateLoading(false);
    }
  }, [pressedSeed, translateLoading]);

  const handleQuizWin = useCallback((word, lang) => {
    setVisitQuiz(null);
    setQuizTarget(null);
    onTranslateWin?.(word, lang);
  }, [onTranslateWin]);

  const handleReact = useCallback(async (emoji) => {
    if (!pressedSeed || !friend) return;
    try {
      await reactToPlant(friend.id, pressedSeed.word, emoji);
      setPlantedSeeds(s => s.map(seed =>
        seed.word === pressedSeed.word && seed.x === pressedSeed.x
          ? { ...seed, reactions: [{ emoji, from_user_id: "me", from_name: "You" }] }
          : seed
      ));
    } catch {
      // silently fail
    }
  }, [pressedSeed, friend]);


  // Word card position (same math as GardenScreen)
  let cardEl = null;
  if (pressed && pressedSeed) {
    const stemH = 22 * (pressed.scale || 1);
    const rawX  = cam.x + (pressed.x + 450);
    const cardHW = 100;
    const screenX = Math.max(cardHW + 8, Math.min((cam.vw || 360) - cardHW - 8, rawX));
    const arrowOffset = Math.max(-80, Math.min(80, rawX - screenX));
    const anchorY = cam.y + (pressed.y + 100) - stemH - 18;
    const flipBelow = anchorY - 140 < 8;
    const screenY = flipBelow ? cam.y + (pressed.y + 100) + 14 : anchorY;

    const existingReaction = pressedSeed.reactions?.[0] ?? null;
    const canCompliment = pressedSeed.stage >= 5 && !existingReaction;
    const example = pressedSeed.exampleSentence
      ? pressedSeed.exampleSentence.replace(/___/g, pressed.word)
      : null;

    cardEl = (
      <div
        className={`word-card${flipBelow ? " below" : ""}`}
        style={{ left: screenX, top: screenY, "--lang-color": pressedSeed.langColor || "#5a9eb8", "--arrow-x": `${arrowOffset}px` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="wc-top">
          <span className="lang">{(pressedSeed.lang || "?").toUpperCase()}</span>
          {pressedSeed.partOfSpeech && <span className="wc-pos">{pressedSeed.partOfSpeech}</span>}
        </div>
        <div className="wc-word">{pressed.word}</div>
        {pressedSeed.ipa && (
          <div className="ipa">{pressedSeed.ipa.startsWith("/") ? pressedSeed.ipa : `/${pressedSeed.ipa}/`}</div>
        )}
        {pressedSeed.gloss && <div className="trans">{pressedSeed.gloss}</div>}
        {example && <div className="wc-example">"{example}"</div>}

        {existingReaction && (
          <div className="wc-reactions" style={{ marginTop: 6 }}>
            <span className="wc-reaction" title={existingReaction.from_name}>{existingReaction.emoji}</span>
            <span style={{ fontSize: 9, color: "#8a6a3a", fontFamily: "'Lilita One',sans-serif" }}>
              from {existingReaction.from_name}
            </span>
          </div>
        )}

        {canCompliment && (
          <div className="visit-react-row">
            {REACTION_EMOJIS.map(emoji => (
              <button key={emoji} className="visit-react-btn" onClick={() => handleReact(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        <button
          className="hd-btn"
          style={{
            marginTop: 8, width: "100%", fontSize: 11,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            background: translateLoading
              ? "linear-gradient(180deg,#d0d0d0,#a0a0a0)"
              : "linear-gradient(180deg,#5abde8,#2e8eb5)",
            borderColor: translateLoading ? "#888" : "#1a5a7a",
            color: "#fff",
            boxShadow: `0 3px 0 ${translateLoading ? "#888" : "#1a5a7a"}`,
          }}
          onClick={handleTranslate}
          disabled={translateLoading}
        >
          🌐 {translateLoading ? "LOADING…" : "TRANSLATE IT"}
        </button>
      </div>
    );
  }

  return (
    <div className="scene">
      <div className="sky-bar">
        <button className="icon-btn" onClick={onClose}>
          <ChevronLeft size={15} strokeWidth={2.5} />
        </button>
        <div style={{ flex: 1 }} />
        <div className="sign"><h1>🌸 {name}'s Garden</h1></div>
        <div style={{ flex: 1 }} />
        <button className="icon-btn" onClick={() => setShowCollection(true)} title={`View ${name}'s collection`}>
          <BookOpen size={15} strokeWidth={2.5} />
        </button>
        <div className="pill">
          <span className="ic">🔥</span>{friend?.streak ?? 0}d
        </div>
      </div>

      <div
        className="stage"
        style={{ bottom: 72 }}
        ref={vpRef}
        onClick={(e) => { if (e.target === e.currentTarget) setPressed(null); }}
      >
        <GardenWorld
          vpRef={vpRef}
          pressed={pressed}
          setPressed={setPressed}
          plantedSeeds={plantedSeeds}
          planting={null}
          onPlantAt={() => {}}
        />
        {cardEl}
      </div>

      {plantedSeeds.length === 0 && (
        <div className="visit-empty">
          <div style={{ fontSize: 40 }}>🌱</div>
          <div>{name} hasn't planted anything yet.</div>
        </div>
      )}

      <button className="visit-gift-btn" onClick={() => setShowGift(true)}>
        🎁 GIFT A SEED
      </button>

      {showGift && (
        <GiftPickerPanel friend={friend} onClose={() => setShowGift(false)} />
      )}

      {showCollection && (
        <CollectionPanel friend={friend} onClose={() => setShowCollection(false)} />
      )}

      {visitQuiz && (
        <QuizModal
          quiz={visitQuiz}
          onClose={() => { setVisitQuiz(null); setQuizTarget(null); }}
          onWin={handleQuizWin}
        />
      )}
    </div>
  );
}
