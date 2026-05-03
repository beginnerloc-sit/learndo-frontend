import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { LoadingSplash } from "./components/LoadingSplash";
import { GardenScreen } from "./screens/GardenScreen";
import { LessonScreen } from "./screens/LessonScreen";
import { VisitScreen } from "./screens/VisitScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { FriendsScreen } from "./screens/FriendsScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { MapBuilder } from "./screens/MapBuilder";
import { getStoredAuth, saveAuth, clearAuth } from "./api/auth";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AppShell() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [tab, setTab] = useState("garden");
  const [visitFriend, setVisitFriend] = useState(null);
  const [pendingPlant, setPendingPlant] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  // Two-phase splash: `splashRendered` keeps the DOM node; `splashFading` triggers the opacity → 0 transition.
  const [splashRendered, setSplashRendered] = useState(true);
  const [splashFading, setSplashFading]     = useState(false);
  const splashTimers = useRef([]);
  const { playing, toggleMute } = useBackgroundMusic();

  const clearSplashTimers = () => {
    splashTimers.current.forEach(clearTimeout);
    splashTimers.current = [];
  };

  // Show splash for `ms`, then fade-out for ~500ms, then unmount.
  const showSplash = (ms = 1700) => {
    clearSplashTimers();
    setSplashRendered(true);
    setSplashFading(false);
    splashTimers.current.push(setTimeout(() => setSplashFading(true), ms));
    splashTimers.current.push(setTimeout(() => setSplashRendered(false), ms + 500));
  };

  // Initial boot splash
  useEffect(() => {
    showSplash(2200);
    return clearSplashTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pick which screen renders UNDER the splash ───────────────────────────
  let activeScreen;

  if (!auth) {
    activeScreen = <AuthScreen onAuth={(a) => { setAuth(a); setTab("garden"); showSplash(1900); }} />;
  } else if (!auth.user?.lang_prefs?.length || !auth.user?.vocab_level || showSettings) {
    const needsSetup = !auth.user?.lang_prefs?.length || !auth.user?.vocab_level;
    activeScreen = (
      <SettingsScreen
        initial={{
          langPrefs:      auth.user?.lang_prefs ?? [],
          vocabLevel:     auth.user?.vocab_level ?? "",
          topicPrefs:     auth.user?.topic_prefs ?? [],
          definitionLang: auth.user?.definition_lang ?? "english",
        }}
        canSkip={showSettings && !needsSetup}
        onDone={(updatedUser) => {
          if (updatedUser) {
            const newAuth = {
              ...auth,
              user: {
                ...auth.user,
                lang_prefs:      updatedUser.langPrefs,
                vocab_level:     updatedUser.vocabLevel,
                topic_prefs:     updatedUser.topicPrefs,
                definition_lang: updatedUser.definitionLang,
              },
            };
            saveAuth(newAuth);
            setAuth(newAuth);
            // Brief splash so the jump from settings to the garden feels nicer
            if (needsSetup) showSplash(1900);
          }
          setShowSettings(false);
        }}
      />
    );
  } else {
    const goVisit  = (friend) => { setVisitFriend(friend); setTab("visit"); showSplash(1500); };
    const goGarden = () => { setTab("garden"); showSplash(1400); };
    const logout   = () => { clearAuth(); setAuth(null); };
    const handleTranslateWin = (word, lang) => { setPendingPlant({ word, lang }); setTab("garden"); };

    activeScreen = (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
        {tab === "lesson" ? (
          <LessonScreen onClose={goGarden} />
        ) : tab === "visit" ? (
          <VisitScreen friend={visitFriend} onClose={goGarden} onTranslateWin={handleTranslateWin} />
        ) : tab === "leaderboard" ? (
          <LeaderboardScreen onClose={goGarden} onVisit={goVisit} />
        ) : tab === "friends" ? (
          <FriendsScreen
            onClose={goGarden}
            onVisit={goVisit}
            onLeaderboard={() => setTab("leaderboard")}
          />
        ) : (
          <GardenScreen
            user={auth.user}
            onLesson={() => setTab("lesson")}
            onVisit={() => setTab("friends")}
            onLeaderboard={() => setTab("leaderboard")}
            onLogout={logout}
            onOpenSettings={() => setShowSettings(true)}
            musicPlaying={playing}
            onToggleMusic={toggleMute}
            pendingPlant={pendingPlant}
            onClearPending={() => setPendingPlant(null)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {activeScreen}
      {splashRendered && <LoadingSplash fading={splashFading} />}
    </>
  );
}

function DesktopGate() {
  return (
    <div className="desktop-gate">
      <div className="desktop-gate-card">
        <div className="desktop-gate-emoji">🌱</div>
        <h1 className="desktop-gate-title">Whoa, big screen!</h1>
        <p className="desktop-gate-body">
          Our little garden was lovingly designed for pockets, not panoramas.
          Your plants are shy around large monitors. 🙈
        </p>
        <p className="desktop-gate-hint">
          Open Learndo on your phone and they'll bloom right up! 🌸
        </p>
        <div className="desktop-gate-phone">📱</div>
      </div>
    </div>
  );
}

function useHashRoute() {
  const [hash, setHash] = useState(typeof window === "undefined" ? "" : window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  // Map builder route is unauthenticated and bypasses the desktop gate.
  if (hash === "#/build-map") {
    return (
      <QueryClientProvider client={queryClient}>
        <MapBuilder />
      </QueryClientProvider>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <DesktopGate />
      <AppShell />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
