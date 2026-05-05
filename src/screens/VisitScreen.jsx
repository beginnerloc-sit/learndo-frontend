import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, BookOpen } from "lucide-react";
import { GardenWorld } from "../components/GardenWorld";
import { QuizModal, buildQuiz } from "../components/QuizModal";
import { GiftPickerPanel } from "../components/GiftPickerPanel";
import { CollectionPanel } from "../components/CollectionPanel";
import { useVocabulary } from "../hooks/useVocabulary";
import { useCurrentUser } from "../hooks/useUser";
import { fetchWordQuiz } from "../api/vocabulary";
import { reactToPlant, writeNoteOnPlant } from "../api/leaderboard";

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
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");

  const { data: gardenPlants } = useVocabulary(friend?.id);
  const { data: me } = useCurrentUser();
  const myId = me?.id ?? "me";

  useEffect(() => {
    if (!gardenPlants) return;
    if (!initialized.current) {
      initialized.current = true;
      setPlantedSeeds(gardenPlants);
      return;
    }
    // Merge social fields from periodic refetches without overwriting any
    // local optimistic updates (e.g. a reaction the visitor just sent).
    const remoteByWord = new Map(gardenPlants.map(p => [p.word, p]));
    setPlantedSeeds(prev => prev.map(p => {
      const r = remoteByWord.get(p.word);
      if (!r) return p;
      // Local reaction wins if visitor just sent one this session
      const reactions = (p.reactions?.length ?? 0) > (r.reactions?.length ?? 0)
        ? p.reactions : (r.reactions ?? p.reactions);
      return {
        ...p,
        reactions,
        notes: r.notes ?? p.notes,
      };
    }));
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

  const handleSubmitNote = useCallback(async () => {
    if (!pressedSeed || !friend) return;
    const text = noteDraft.trim();
    if (!text) { setNoteError("Write something first"); return; }
    setNoteSaving(true); setNoteError("");
    try {
      const saved = await writeNoteOnPlant(friend.id, pressedSeed.word, text);
      // Optimistically merge into local state — replace any existing note
      // from the current visitor (server already de-dups by from_user_id).
      setPlantedSeeds(s => s.map(seed => {
        if (seed.word !== pressedSeed.word) return seed;
        const others = (seed.notes || []).filter(n => n.from_user_id !== saved.from_user_id);
        return { ...seed, notes: [saved, ...others] };
      }));
      setNoteDraft("");
    } catch (e) {
      setNoteError(e.message || "Failed");
    } finally {
      setNoteSaving(false);
    }
  }, [pressedSeed, friend, noteDraft]);

  // Reset the draft + error when switching plants. Notes are write-once so
  // we DON'T prefill the input with an existing note — the existing one is
  // shown read-only in the side panel.
  useEffect(() => {
    setNoteError("");
    setNoteDraft("");
  }, [pressedSeed?.word, friend, myId]);

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
    const canCompliment = pressedSeed.stage >= 4 && !existingReaction;
    const example = pressedSeed.exampleSentence
      ? pressedSeed.exampleSentence.replace(/___/g, pressed.word)
      : null;

    // Side notes panel — same positioning logic as GardenScreen.
    const NOTES_W = 130, GAP = 8;
    const vw = cam.vw || 360;
    const rightEnd = screenX + cardHW + GAP + NOTES_W;
    const notesOnLeft = rightEnd > vw - 8;
    const notesLeft = notesOnLeft ? screenX - cardHW - GAP : screenX + cardHW + GAP;

    const allNotes = pressedSeed.notes ?? [];
    const myNote   = allNotes.find(n => n.from_user_id === myId) ?? null;
    const otherNotes = allNotes.filter(n => n.from_user_id !== myId);
    // Visitor's own note shown FIRST so it's easy to find/edit.
    const orderedNotes = myNote ? [myNote, ...otherNotes] : otherNotes;
    const hasMyNote = !!myNote;

    cardEl = (<>
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
        {pressedSeed.ipa && <div className="ipa">{pressedSeed.ipa}</div>}
        {pressedSeed.gloss && <div className="trans">{pressedSeed.gloss}</div>}
        {example && <div className="wc-example">"{example}"</div>}

        {existingReaction && (
          <>
            <div className="wc-section-title">🎁 Gift</div>
            <div className="wc-reactions" style={{ marginTop: 2 }}>
              <span className="wc-reaction" title={existingReaction.from_name}>{existingReaction.emoji}</span>
              <span style={{ fontSize: 9, color: "#8a6a3a", fontFamily: "'Lilita One',sans-serif" }}>
                from {existingReaction.from_name}
              </span>
            </div>
          </>
        )}

        {canCompliment && (
          <>
            <div className="wc-section-title">🎁 Gift {name} a reaction</div>
            <div className="visit-react-row">
              {REACTION_EMOJIS.map(emoji => (
                <button key={emoji} className="visit-react-btn" onClick={() => handleReact(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Notes are write-once. If the visitor has already left a note,
            it's shown read-only in the side panel — we just show a locked
            label here. Otherwise, the compose input is shown. */}
        {hasMyNote ? (
          <div className="visit-note-locked">
            ✓ You've already left a note on this plant
          </div>
        ) : (
          <div className="visit-note-compose">
            <div className="visit-note-compose-title">📝 Leave a note for {name} (one-time)</div>
            <input
              className="visit-note-input"
              type="text"
              placeholder="One short sentence…"
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value.slice(0, 80))}
              maxLength={80}
              onKeyDown={e => { if (e.key === "Enter" && !noteSaving && noteDraft.trim()) handleSubmitNote(); }}
            />
            <div className="visit-note-foot">
              <span className="visit-note-counter">{noteDraft.length}/80</span>
              <button
                className="visit-note-submit"
                onClick={handleSubmitNote}
                disabled={noteSaving || !noteDraft.trim()}
              >
                {noteSaving ? "…" : "SEND"}
              </button>
            </div>
            {noteError && <div className="visit-note-error">{noteError}</div>}
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

      {orderedNotes.length > 0 && (
        <div
          className={`plant-notes-side${flipBelow ? " below" : ""} ${notesOnLeft ? "on-left" : "on-right"}`}
          style={{ left: notesLeft, top: screenY }}
          onClick={e => e.stopPropagation()}
        >
          <div className="plant-notes-title">💬 Notes</div>
          {orderedNotes.slice(0, 4).map((n, i) => (
            <div
              key={`${n.from_user_id}-${i}`}
              className={`plant-note${n.from_user_id === myId ? " mine" : ""}`}
            >
              <div className="plant-note-from">
                {n.from_user_id === myId ? "You" : n.from_name}
              </div>
              <div className="plant-note-text">"{n.text}"</div>
            </div>
          ))}
        </div>
      )}
    </>);
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
