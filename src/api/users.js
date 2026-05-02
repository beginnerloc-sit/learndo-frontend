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
    vocabLevel: u.vocab_level ?? null,
    topicPrefs: u.topic_prefs ?? [],
    definitionLang: u.definition_lang ?? "english",
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

export async function searchUsers(q) {
  const res = await fetch(`${BASE}/users/search?q=${encodeURIComponent(q)}`, { headers: authHeader() });
  if (!res.ok) throw new Error("Search failed");
  const list = await res.json();
  return list.map(norm);
}

function normRequest(r) {
  return { id: r.id, user: norm(r.user), createdAt: r.created_at };
}

export async function sendFriendRequest(friendId) {
  const res = await fetch(`${BASE}/users/me/friend-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ friend_id: friendId }),
  });
  if (!res.ok) throw new Error("Failed to send request");
  return normRequest(await res.json());
}

export async function fetchIncomingRequests() {
  const res = await fetch(`${BASE}/users/me/friend-requests`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to fetch requests");
  return (await res.json()).map(normRequest);
}

export async function fetchOutgoingRequests() {
  const res = await fetch(`${BASE}/users/me/friend-requests/sent`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to fetch requests");
  return (await res.json()).map(normRequest);
}

export async function acceptFriendRequest(requestId) {
  const res = await fetch(`${BASE}/users/me/friend-requests/${requestId}/accept`, {
    method: "POST",
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("Failed to accept");
  return norm(await res.json());
}

export async function declineFriendRequest(requestId) {
  const res = await fetch(`${BASE}/users/me/friend-requests/${requestId}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("Failed to decline");
}

export async function removeFriend(friendId) {
  const res = await fetch(`${BASE}/users/me/friends/${encodeURIComponent(friendId)}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("Failed to remove friend");
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

export async function updateSettings({ langs, vocabLevel, topicPrefs, definitionLang } = {}) {
  const body = {};
  if (langs           !== undefined) body.langs            = langs;
  if (vocabLevel      !== undefined) body.vocab_level      = vocabLevel;
  if (topicPrefs      !== undefined) body.topic_prefs      = topicPrefs;
  if (definitionLang  !== undefined) body.definition_lang  = definitionLang;
  const res = await fetch(`${BASE}/users/me/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save settings");
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
