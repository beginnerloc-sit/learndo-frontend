import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { GardenScreen } from "./screens/GardenScreen";
import { LessonScreen } from "./screens/LessonScreen";
import { VisitScreen } from "./screens/VisitScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { LangPickerScreen } from "./screens/LangPickerScreen";
import { getStoredAuth, saveAuth, clearAuth } from "./api/auth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AppShell() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [tab, setTab] = useState("garden");
  const [visitFriend, setVisitFriend] = useState(null);
  const [pendingPlant, setPendingPlant] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);

  if (!auth) {
    return <AuthScreen onAuth={(a) => { setAuth(a); setTab("garden"); }} />;
  }

  // First login: no language prefs set yet
  const needsLangSetup = !auth.user?.lang_prefs?.length;
  if (needsLangSetup || showLangPicker) {
    return (
      <LangPickerScreen
        initial={auth.user?.lang_prefs ?? []}
        canSkip={showLangPicker && !needsLangSetup}
        onDone={(updatedUser) => {
          if (updatedUser) {
            const newAuth = { ...auth, user: { ...auth.user, lang_prefs: updatedUser.langPrefs } };
            saveAuth(newAuth);
            setAuth(newAuth);
          }
          setShowLangPicker(false);
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
          onEditLangs={() => setShowLangPicker(true)}
          pendingPlant={pendingPlant}
          onClearPending={() => setPendingPlant(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
