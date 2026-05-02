import { useEffect, useRef, useState } from "react";

const MUTE_KEY = "learndo_music_muted";
const TARGET_VOLUME = 0.35;     // pleasant background level
const FADE_MS = 600;            // fade in/out duration

/**
 * Production-style background music:
 *  - Streams on demand (preload="none"), no JS-bundle bloat
 *  - Starts on the first user gesture anywhere on the page (browsers block earlier)
 *  - Mute state persisted in localStorage
 *  - Smoothly fades in/out instead of cutting
 *  - Auto-pauses when the tab is hidden, resumes when visible
 *  - Single shared <audio> element for the whole session
 */
export function useBackgroundMusic({ src = "/background_music.aac" } = {}) {
  const audioRef    = useRef(null);
  const fadeTimerRef = useRef(null);

  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
  });
  const [started, setStarted] = useState(false);

  // Create the <audio> element once
  useEffect(() => {
    const a = new Audio(src);
    a.loop = true;
    a.preload = "none";          // don't fetch until play() is called
    a.volume = 0;                 // start silent so we can fade in
    audioRef.current = a;
    return () => {
      cancelFade();
      a.pause();
      a.src = "";
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancelFade() {
    if (fadeTimerRef.current) {
      cancelAnimationFrame(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }

  function fadeTo(targetVol, onDone) {
    const a = audioRef.current;
    if (!a) return;
    cancelFade();
    const start = a.volume;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / FADE_MS);
      a.volume = start + (targetVol - start) * t;
      if (t < 1) fadeTimerRef.current = requestAnimationFrame(tick);
      else { fadeTimerRef.current = null; onDone?.(); }
    };
    fadeTimerRef.current = requestAnimationFrame(tick);
  }

  // Start on the first user interaction (autoplay is blocked otherwise)
  useEffect(() => {
    if (started || muted) return;
    const startOnGesture = () => {
      const a = audioRef.current;
      if (!a) return;
      a.play()
        .then(() => { setStarted(true); fadeTo(TARGET_VOLUME); })
        .catch(() => {/* still blocked — try again on next gesture */});
    };
    const opts = { once: true };
    window.addEventListener("pointerdown", startOnGesture, opts);
    window.addEventListener("keydown",     startOnGesture, opts);
    return () => {
      window.removeEventListener("pointerdown", startOnGesture, opts);
      window.removeEventListener("keydown",     startOnGesture, opts);
    };
  }, [started, muted]);

  // Pause when the tab goes hidden, resume when it comes back
  useEffect(() => {
    const onVis = () => {
      const a = audioRef.current;
      if (!a || !started || muted) return;
      if (document.hidden) a.pause();
      else a.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [started, muted]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch {}

    const a = audioRef.current;
    if (!a) return;
    if (next) {
      // fade out then pause
      fadeTo(0, () => a.pause());
    } else {
      // unmute: try to play and fade in
      a.play().then(() => {
        setStarted(true);
        fadeTo(TARGET_VOLUME);
      }).catch(() => {/* will start on next gesture */});
    }
  }

  return {
    muted,
    started,
    playing: started && !muted,   // true only when music is actually audible
    toggleMute,
  };
}
