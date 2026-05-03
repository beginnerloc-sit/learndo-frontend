import { useRef, useState, useEffect, useCallback } from "react";
import { Users, LogOut, Settings, Music, VolumeX } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GardenWorld, WORLD } from "../components/GardenWorld";
import { QuizModal, buildQuiz } from "../components/QuizModal";
import { CollectionPanel } from "../components/CollectionPanel";
import { fetchQuiz, fetchWordQuiz, normPlant } from "../api/vocabulary";
import { fetchPendingGifts, plantPendingGift } from "../api/leaderboard";
import { useCurrentUser } from "../hooks/useUser";
import { useVocabulary, usePlantWord, useAdvanceWordStage, useHarvestPlant, useMovePlant } from "../hooks/useVocabulary";
import { wordTheme } from "../utils/wordTheme";

export function GardenScreen({ user: authUser, onLesson, onVisit, onLeaderboard, onLogout, onOpenSettings, musicPlaying, onToggleMusic, pendingPlant, onClearPending }) {
  const { data: fetchedUser } = useCurrentUser();
  const user = authUser ?? fetchedUser;
  const queryClient = useQueryClient();
  const plantWord    = usePlantWord();
  const advanceStage = useAdvanceWordStage();
  const harvestMut   = useHarvestPlant();
  const moveMut      = useMovePlant();

  const { data: gardenPlants } = useVocabulary(user?.id);
  const { data: pendingGifts = [] } = useQuery({
    queryKey: ["pendingGifts"],
    queryFn: fetchPendingGifts,
    staleTime: 60 * 1000,
    enabled: !!user,
  });

  const vpRef       = useRef(null);
  const initialized = useRef(false);
  const cachedSeed  = useRef(null); // holds last fetched quiz until correctly answered

  const [cam, setCam]               = useState({ x: -260, y: -50, vw: 360, vh: 460 });
  const [pressed, setPressed]       = useState(null);
  const [showHint, setShowHint]     = useState(true);
  const [planting, setPlanting]     = useState(null);
  const [moving, setMoving]         = useState(null);   // {id, word, lang, langColor}
  const [plantedSeeds, setPlantedSeeds] = useState([]);
  const [ghost, setGhost]           = useState({ x: 0, y: 0, visible: false });
  const [quiz, setQuiz]             = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [waterQuiz, setWaterQuiz]     = useState(null);
  const [watering, setWatering]       = useState(null);
  const [showCollection, setShowCollection] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPendingGifts, setShowPendingGifts] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ startX: 0, startY: 0, moved: false, hideTimer: null });
  const [seedError, setSeedError] = useState("");
  const [weather, setWeather] = useState(null);   // { type, label }

  // Load garden plants from DB once
  useEffect(() => {
    if (gardenPlants && !initialized.current) {
      initialized.current = true;
      setPlantedSeeds(gardenPlants);
    }
  }, [gardenPlants]);


  useEffect(() => {
    if (pendingPlant) {
      setPlanting(pendingPlant);
      onClearPending?.();
    }
  }, [pendingPlant]);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const handler = (e) => setCam(e.detail);
    const weatherHandler = (e) => setWeather(e.detail);
    el.addEventListener("cam", handler);
    el.addEventListener("weather", weatherHandler);
    return () => {
      el.removeEventListener("cam", handler);
      el.removeEventListener("weather", weatherHandler);
    };
  }, []);

  useEffect(() => {
    const el = vpRef.current;
    if ((!planting && !moving) || !el) return;
    const onMove  = (e) => { const r = el.getBoundingClientRect(); setGhost({ x: e.clientX - r.left, y: e.clientY - r.top, visible: true }); };
    const onLeave = () => setGhost(g => ({ ...g, visible: false }));
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); };
  }, [planting, moving]);

  const handlePlantAt = useCallback((wx, wy) => {
    if (!planting) return;
    const tempId = `ps-${Date.now()}`;
    const newSeed = { id: tempId, x: wx, y: wy, word: planting.word, lang: planting.lang, langColor: planting.langColor, scale: 1.85, stage: 0 };
    setPlantedSeeds(s => [...s, newSeed]);

    if (planting.pendingGiftId) {
      plantPendingGift(planting.pendingGiftId, wx, wy)
        .then(p => {
          setPlantedSeeds(s => s.map(seed => seed.id === tempId ? normPlant(p) : seed));
          queryClient.invalidateQueries({ queryKey: ["pendingGifts"] });
        })
        .catch(() => setPlantedSeeds(s => s.filter(seed => seed.id !== tempId)));
    } else {
      plantWord.mutate({ word: planting.word, x: wx, y: wy, scale: 1.85 }, {
        onSuccess: (saved) => {
          setPlantedSeeds(s => s.map(seed => seed.id === tempId ? saved : seed));
        },
      });
    }

    setPlanting(null);
    setGhost(g => ({ ...g, visible: false }));
  }, [planting, plantWord, queryClient]);

  const handleMoveTo = useCallback((wx, wy) => {
    if (!moving) return;
    setPlantedSeeds(s => s.map(seed =>
      seed.id === moving.id ? { ...seed, x: wx, y: wy } : seed
    ));
    moveMut.mutate({ id: moving.id, x: wx, y: wy });
    setMoving(null);
    setPressed(null);
    setGhost(g => ({ ...g, visible: false }));
  }, [moving, moveMut]);

  const handleWin = (word, lang) => {
    cachedSeed.current = null;
    setQuiz(null);
    setPlanting({ word, lang });
  };

  const handleNewSeed = async () => {
    if (seedLoading) return;
    if (cachedSeed.current) { setQuiz(cachedSeed.current); return; }
    setSeedLoading(true);
    setSeedError("");
    try {
      const data = await fetchQuiz();
      const q = buildQuiz(data);
      cachedSeed.current = q;
      setQuiz(q);
    } catch (e) {
      if (e.code === "QUOTA") {
        setSeedError(e.message);
        setTimeout(() => setSeedError(""), 6000);
      }
      // other errors fail silently — user can tap again
    } finally {
      setSeedLoading(false);
    }
  };

  const handleWaterTap = useCallback(async (id, word, stage) => {
    setWatering({ id, word });
    try {
      const data = await fetchWordQuiz(word, stage);
      setWaterQuiz(buildQuiz(data));
    } catch {
      setPlantedSeeds(s => s.map(seed => seed.id === id && seed.stage < 4 ? { ...seed, stage: seed.stage + 1 } : seed));
      advanceStage.mutate(id);
      setWatering(null);
    }
  }, [advanceStage]);

  const handleWaterWin = useCallback(() => {
    if (!watering) return;
    setPlantedSeeds(s => s.map(seed => seed.id === watering.id && seed.stage < 4 ? { ...seed, stage: seed.stage + 1 } : seed));
    advanceStage.mutate(watering.id);
    setWaterQuiz(null);
    setWatering(null);
  }, [watering, advanceStage]);

  const pressedSeed = pressed
    ? plantedSeeds.find(s => s.word === pressed.word && s.x === pressed.x && s.y === pressed.y)
    : null;
  const canWater   = pressedSeed && pressedSeed.stage < 4;
  const canHarvest = pressedSeed && pressedSeed.stage >= 4;

  const handleHarvest = useCallback(() => {
    if (!pressedSeed) return;
    setPlantedSeeds(s => s.filter(seed => seed.id !== pressedSeed.id));
    harvestMut.mutate(pressedSeed.id);
    setPressed(null);
  }, [pressedSeed, harvestMut]);

  const giftedCount = pendingGifts.length;

  const mmW = 78, mmH = 78;
  const sx = mmW / WORLD.w, sy = mmH / WORLD.h;
  const vpL = (-cam.x) * sx, vpT = (-cam.y) * sy;
  const vpW = (cam.vw || 360) * sx, vpH = (cam.vh || 460) * sy;
  const dotL = (-cam.x + (cam.vw || 360) / 2) * sx - 3;
  const dotT = (-cam.y + (cam.vh || 460) / 2) * sy - 3;

  return (
    <div className="scene">
      {/* Top bar */}
      <div className="sky-bar">
        <div className="pill"><span className="ic">🌸</span>{plantedSeeds.length}</div>
        {weather && (
          <div className="pill weather-pill" title={`Today's weather: ${weather.label}`}>
            {weather.label}
          </div>
        )}
        {giftedCount > 0 && (
          <button className="gift-notif-pill" onClick={() => setShowPendingGifts(true)}>
            <span className="gift-ring-icon">🎁</span>
            <span>{giftedCount}</span>
          </button>
        )}
        <div style={{ flex: 1 }} />
        <div className="sign"><h1>{user?.name ?? "Garden"}'s Garden</h1></div>
        <div style={{ flex: 1 }} />
        <button className="icon-btn" onClick={onVisit}><Users size={15} strokeWidth={2} /></button>
        <button className="icon-btn" onClick={onToggleMusic} title={musicPlaying ? "Mute music" : "Play music"}>
          {musicPlaying ? <Music size={15} strokeWidth={2} /> : <VolumeX size={15} strokeWidth={2} />}
        </button>
        <button className="icon-btn" onClick={onOpenSettings}><Settings size={15} strokeWidth={2} /></button>
        <button className="icon-btn" onClick={() => setShowLogoutConfirm(true)}><LogOut size={15} strokeWidth={2} /></button>
      </div>

      {/* Pannable stage */}
      <div
        className={`stage${planting ? " planting" : ""}`}
        ref={vpRef}
        onClick={(e) => { if (e.target === e.currentTarget) setPressed(null); }}
        onPointerDown={(e) => {
          dragStateRef.current.startX = e.clientX;
          dragStateRef.current.startY = e.clientY;
          dragStateRef.current.moved = false;
          if (dragStateRef.current.hideTimer) {
            clearTimeout(dragStateRef.current.hideTimer);
            dragStateRef.current.hideTimer = null;
          }
        }}
        onPointerMove={(e) => {
          if (dragStateRef.current.moved) return;
          const dx = e.clientX - dragStateRef.current.startX;
          const dy = e.clientY - dragStateRef.current.startY;
          if (Math.hypot(dx, dy) > 6) {
            dragStateRef.current.moved = true;
            setIsDragging(true);
          }
        }}
        onPointerUp={() => {
          if (dragStateRef.current.moved) {
            dragStateRef.current.hideTimer = setTimeout(() => setIsDragging(false), 900);
          }
          dragStateRef.current.moved = false;
        }}
        onPointerCancel={() => {
          if (dragStateRef.current.moved) {
            dragStateRef.current.hideTimer = setTimeout(() => setIsDragging(false), 900);
          }
          dragStateRef.current.moved = false;
        }}
      >
        <GardenWorld
          vpRef={vpRef}
          pressed={pressed}
          setPressed={setPressed}
          plantedSeeds={moving ? plantedSeeds.filter(p => p.id !== moving.id) : plantedSeeds}
          planting={planting}
          moving={moving}
          onPlantAt={handlePlantAt}
          onMoveTo={handleMoveTo}
        />

        {pressed && pressedSeed && (() => {
          const stemH = 22 * (pressed.scale || 1);
          const rawX  = cam.x + (pressed.x + 450);
          const cardHW = 100;
          const screenX = Math.max(cardHW + 8, Math.min((cam.vw || 360) - cardHW - 8, rawX));
          const arrowOffset = Math.max(-80, Math.min(80, rawX - screenX));
          const anchorY = cam.y + (pressed.y + 100) - stemH - 18;
          const flipBelow = anchorY - 160 < 8;
          const screenY = flipBelow ? cam.y + (pressed.y + 100) + 14 : anchorY;
          const example = pressedSeed.exampleSentence
            ? pressedSeed.exampleSentence.replace(/___/g, pressed.word)
            : null;
          const uniqueReactions = pressedSeed.reactions?.length
            ? [...new Map(pressedSeed.reactions.map(r => [r.emoji, r])).values()]
            : [];
          return (
            <div
              className={`word-card${flipBelow ? " below" : ""}`}
              style={{ left: screenX, top: screenY, "--lang-color": pressedSeed.langColor ?? "#5a9eb8", "--arrow-x": `${arrowOffset}px` }}
            >
              {pressedSeed.giftedBy && pressedSeed.stage === 0 && (
                <div className="gift-from-tag">
                  🎁 From {pressedSeed.giftedByName ?? "a friend"}
                </div>
              )}
              <div className="wc-top">
                <span className="lang" style={{ "--lang-color": pressedSeed.langColor ?? "#5a9eb8" }}>
                  {(pressedSeed.lang ?? "?").toUpperCase()}
                </span>
                {pressedSeed.partOfSpeech && (
                  <span className="wc-pos">{pressedSeed.partOfSpeech}</span>
                )}
              </div>
              <div className="wc-word" style={(() => { const t = wordTheme(pressed.word); return { fontFamily: t.fontFamily, color: t.color, fontStyle: t.fontStyle, fontWeight: t.fontWeight, letterSpacing: t.letterSpacing }; })()}>{pressed.word}</div>
              {pressedSeed.ipa && <div className="ipa">{pressedSeed.ipa.startsWith("/") ? pressedSeed.ipa : `/${pressedSeed.ipa}/`}</div>}
              {pressedSeed.gloss && <div className="trans">{pressedSeed.gloss}</div>}
              {example && <div className="wc-example">"{example}"</div>}
              {uniqueReactions.length > 0 && (
                <div className="wc-reactions">
                  {uniqueReactions.map(r => (
                    <span key={r.emoji} className="wc-reaction-pill" title={r.from_name}>
                      <span className="wc-reaction-emoji">{r.emoji}</span>
                      <span className="wc-reaction-from">from {r.from_name}</span>
                    </span>
                  ))}
                </div>
              )}
              {canWater && (
                <button
                  className="hd-btn yellow"
                  style={{ marginTop: 8, width: "100%", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                  onClick={(e) => { e.stopPropagation(); handleWaterTap(pressedSeed.id, pressed.word, pressedSeed.stage); }}
                >
                  💧 WATER ({pressedSeed.stage}/4)
                </button>
              )}
              {canHarvest && (
                <button
                  className="hd-btn"
                  style={{ marginTop: 8, width: "100%", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "linear-gradient(180deg,#ffd96a,#e8a91a)", borderColor: "#6e4e0e", color: "#3a2008", boxShadow: "0 3px 0 #6e4e0e" }}
                  onClick={(e) => { e.stopPropagation(); handleHarvest(); }}
                >
                  🌸 HARVEST
                </button>
              )}
              <button
                className="hd-btn"
                style={{ marginTop: 6, width: "100%", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "linear-gradient(180deg,#cfe8be,#9cc47b)", borderColor: "#3e6534", color: "#1c4a10", boxShadow: "0 3px 0 #3e6534" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMoving({
                    id: pressedSeed.id,
                    word: pressedSeed.word,
                    lang: pressedSeed.lang,
                    langColor: pressedSeed.langColor,
                  });
                  setPressed(null);
                }}
              >
                ✋ MOVE
              </button>
            </div>
          );
        })()}
      </div>

      {/* Minimap — only visible while panning */}
      <div className={`minimap${isDragging ? " visible" : ""}`}>
        <div className="vp" style={{ left: vpL, top: vpT, width: vpW, height: vpH }} />
        {plantedSeeds.map(s => (
          <div key={s.id} style={{
            position: "absolute",
            width: 3, height: 3,
            borderRadius: 999,
            background: s.langColor ?? "#5a9333",
            left: (s.x + 450) * sx - 1.5,
            top:  (s.y + 100) * sy - 1.5,
          }} />
        ))}
        <div style={{ position: "absolute", width: 6, height: 6, borderRadius: 999, background: "#b53a6a", border: "1.5px solid #5a3e1a", left: dotL, top: dotT }} />
      </div>

      {showHint && !planting && <div className="pan-hint">DRAG TO EXPLORE →</div>}

      {(planting || moving) && ghost.visible && (
        <div className="ghost-seed" style={{ left: ghost.x, top: ghost.y }}>
          <svg width="50" height="58" viewBox="-25 -30 50 58">
            <ellipse cx="0" cy="20" rx="12" ry="3" fill="rgba(20,30,10,0.3)" />
            <ellipse cx="0" cy="0" rx="6" ry="8" fill={moving ? "#9cc47b" : "#d9a85a"} stroke={moving ? "#3e6534" : "#7a4a1a"} strokeWidth="1.4" />
          </svg>
          <div className="ghost-label">{(planting || moving).word}</div>
        </div>
      )}

      {planting ? (
        <div className="plant-banner">
          <div className="ic">🌱</div>
          <div className="lbl">
            <div className="t">TAP TO PLANT</div>
            <div className="s">{planting.word} · {planting.lang}</div>
          </div>
          <button className="hd-btn" style={{ background: "linear-gradient(180deg,#e0e0e0,#aaa)", borderColor: "#555", color: "#fff" }} onClick={() => { setPlanting(null); setGhost(g => ({ ...g, visible: false })); }}>CANCEL</button>
        </div>
      ) : moving ? (
        <div className="plant-banner" style={{ borderColor: "#3e6534" }}>
          <div className="ic">✋</div>
          <div className="lbl">
            <div className="t">TAP TO MOVE</div>
            <div className="s">{moving.word} · {moving.lang}</div>
          </div>
          <button className="hd-btn" style={{ background: "linear-gradient(180deg,#e0e0e0,#aaa)", borderColor: "#555", color: "#fff" }} onClick={() => { setMoving(null); setGhost(g => ({ ...g, visible: false })); }}>CANCEL</button>
        </div>
      ) : (
        <>
          <button
            className={`seed-peek${seedLoading ? " seed-loading" : ""}${seedError ? " seed-quota" : ""}`}
            onClick={handleNewSeed}
            disabled={seedLoading || !!seedError}
          >
            <div className="pouch">
              {seedError ? "🌅" : seedLoading ? <span className="seed-sprout">🌱</span> : "🌰"}
            </div>
            <div className="label">
              {seedError
                ? <span style={{ fontSize: 11, lineHeight: 1.2 }}>{seedError}</span>
                : seedLoading
                  ? <b>GROWING…</b>
                  : <><b>NEW SEED</b> · answer to plant</>}
            </div>
            <span className="plant-cta">
              {seedError ? "🚫" : seedLoading ? <span className="seed-dots"><span/><span/><span/></span> : "QUIZ"}
            </span>
          </button>
          <button className="collection-btn" onClick={() => setShowCollection(true)}>
            <div className="icon">🌸</div>
            <div className="label"><b>COLLECTION</b> · harvested words</div>
            <span className="count">{plantedSeeds.filter(s => s.stage >= 4).length > 0 ? "VIEW" : "VIEW"}</span>
          </button>
        </>
      )}

      {showLogoutConfirm && (
        <div className="modal-backdrop" style={{ zIndex: 50 }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>🚪</div>
            <div style={{ fontFamily: "'Lilita One', sans-serif", fontSize: 20, color: "#3e2a16", marginBottom: 6 }}>Log out?</div>
            <div style={{ fontSize: 13, color: "#7a5c3a", marginBottom: 18, lineHeight: 1.4 }}>You'll need to sign back in to tend your garden.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="hd-btn" style={{ flex: 1, fontSize: 13, background: "linear-gradient(180deg,#e0e0e0,#b0b0b0)", borderColor: "#777", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.5), 0 4px 0 #777", color: "#444", textShadow: "none" }} onClick={() => setShowLogoutConfirm(false)}>CANCEL</button>
              <button className="hd-btn" style={{ flex: 1, fontSize: 13, background: "linear-gradient(180deg,#e05555,#a51c1c)", borderColor: "#6a1212", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.3), 0 4px 0 #6a1212", textShadow: "0 2px 0 rgba(0,0,0,0.3)" }} onClick={() => { setShowLogoutConfirm(false); onLogout(); }}>LOG OUT</button>
            </div>
          </div>
        </div>
      )}
      {showPendingGifts && (
        <div className="modal-backdrop" style={{ zIndex: 50 }} onClick={() => setShowPendingGifts(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span style={{ fontFamily: "'Lilita One',sans-serif", fontSize: 16, color: "#3e2a16" }}>🎁 Gifted Seeds</span>
              <button className="x-btn" onClick={() => setShowPendingGifts(false)}>×</button>
            </div>
            <div style={{ fontSize: 12, color: "#7a5c3a", marginBottom: 10 }}>
              Tap a seed to choose where to plant it:
            </div>
            <div className="pending-gifts-list">
              {pendingGifts.map(gift => (
                <button
                  key={gift.id}
                  className="pending-gift-row"
                  onClick={() => {
                    setShowPendingGifts(false);
                    setPlanting({ word: gift.word, lang: gift.lang, langColor: gift.lang_color, pendingGiftId: gift.id });
                  }}
                >
                  <div className="pending-gift-main">
                    <span className="pending-gift-word">{gift.word}</span>
                    <span className="pending-gift-from">from {gift.from_name}</span>
                  </div>
                  <span className="pending-gift-cta">PLANT →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showCollection && <CollectionPanel onClose={() => setShowCollection(false)} currentUser={user} />}
      {quiz && <QuizModal quiz={quiz} onClose={() => setQuiz(null)} onWin={handleWin} />}
      {waterQuiz && (
        <QuizModal
          quiz={waterQuiz}
          onClose={() => { setWaterQuiz(null); setWatering(null); }}
          onWin={handleWaterWin}
        />
      )}
    </div>
  );
}
