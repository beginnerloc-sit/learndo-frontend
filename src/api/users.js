import { authHeader } from "./auth";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function norm(u) {
  return {
    id: u.id,
    name: u.name,
    initials: u.initials,
    avatarColor: u.avatar_color,
    streak: u.streak,
    coins: u.coins,
    plantsCount: u.plants_count,
    visitsCount: u.visits_count,
    langPrefs: u.lang_prefs ?? [],
    collectionLocked: !!u.collection_locked,
  };
}

export async function fetchCurrentUser() {
  const res = await fetch(`${BASE}/users/me`, { headers: authHeader() });
  if (!res.ok) throw new Error("Not authenticated");
  return norm(await res.json());
}

export async function fetchFriends() {
  const res = await fetch(`${BASE}/users/me/friends`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to fetch friends");
  const list = await res.json();
  return list.map(norm);
}

export async function fetchUserById(userId) {
  const res = await fetch(`${BASE}/users/${userId}`, { headers: authHeader() });
  if (!res.ok) throw new Error("User not found");
  return norm(await res.json());
}

export async function updateLangPrefs(langs) {
  const res = await fetch(`${BASE}/users/me/lang-prefs`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ langs }),
  });
  if (!res.ok) throw new Error("Failed to update preferences");
  return norm(await res.json());
}

export async function updateCollectionLock(locked) {
  const res = await fetch(`${BASE}/users/me/collection-lock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ locked }),
  });
  if (!res.ok) throw new Error("Failed to update collection lock");
  return norm(await res.json());
}
