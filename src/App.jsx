import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { GardenScreen } from "./screens/GardenScreen";
import { LessonScreen } from "./screens/LessonScreen";
import { VisitScreen } from "./screens/VisitScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { getStoredAuth, saveAuth, clearAuth } from "./api/auth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AppShell() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [tab, setTab] = useState("garden");
  const [visitFriend, setVisitFriend] = useState(null);
  const [pendingPlant, setPendingPlant] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  if (!auth) {
    return <AuthScreen onAuth={(a) => { setAuth(a); setTab("garden"); }} />;
  }

  // First login: settings haven't been completed (no langs OR no vocab level chosen)
  const needsSetup = !auth.user?.lang_prefs?.length || !auth.user?.vocab_level;
  if (needsSetup || showSettings) {
    return (
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
          }
          setShowSettings(false);
        }}
      />
    );
  }

  const goVisit = (friend) => { setVisitFriend(friend); setTab("visit"); };
  const goGarden = () => setTab("garden");
  const logout = () => { clearAuth(); setAuth(null); };
  const handleTranslateWin = (word, lang) => {
    setPendingPlant({ word, lang });
    setTab("garden");
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {tab === "lesson" ? (
        <LessonScreen onClose={goGarden} />
      ) : tab === "visit" ? (
        <VisitScreen friend={visitFriend} onClose={goGarden} onTranslateWin={handleTranslateWin} />
      ) : tab === "leaderboard" ? (
        <LeaderboardScreen onClose={goGarden} onVisit={goVisit} />
      ) : (
        <GardenScreen
          user={auth.user}
          onLesson={() => setTab("lesson")}
          onVisit={() => setTab("leaderboard")}
          onLeaderboard={() => setTab("leaderboard")}
          onLogout={logout}
          onOpenSettings={() => setShowSettings(true)}
          pendingPlant={pendingPlant}
          onClearPending={() => setPendingPlant(null)}
        />
      )}
    </div>
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DesktopGate />
      <AppShell />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
