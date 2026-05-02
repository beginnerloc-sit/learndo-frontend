import { authHeader } from "./auth";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function norm(e) {
  return {
    id:          e.id,
    name:        e.name,
    initials:    e.initials,
    avatarColor: e.avatar_color,
    streak:      e.streak,
    blooms:      e.harvest_count,
  };
}

export async function fetchLeaderboard() {
  const res = await fetch(`${BASE}/users/leaderboard/top`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return (await res.json()).map(norm);
}

export async function harvestPlant(plantId) {
  const res = await fetch(`${BASE}/garden/${plantId}/harvest`, {
    method: "POST",
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("Failed to harvest plant");
  return res.json();
}

export async function fetchCollection({ q = "", skip = 0, limit = 20, userId = null } = {}) {
  const params = new URLSearchParams({ limit });
  if (q.trim()) params.set("q", q.trim());
  if (skip > 0) params.set("skip", skip);
  if (userId) params.set("user_id", userId);
  const res = await fetch(`${BASE}/garden/collection?${params}`, { headers: authHeader() });
  if (res.status === 403) throw new Error("LOCKED");
  if (!res.ok) throw new Error("Failed to fetch collection");
  return res.json();
}

export async function reactToPlant(ownerUserId, word, emoji) {
  const res = await fetch(`${BASE}/garden/react`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ owner_user_id: ownerUserId, word, emoji }),
  });
  if (!res.ok) throw new Error("Failed to react");
  return res.json();
}

export async function fetchPendingGifts() {
  const res = await fetch(`${BASE}/garden/pending-gifts`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to fetch pending gifts");
  return res.json();
}

export async function plantPendingGift(giftId, x, y) {
  const res = await fetch(`${BASE}/garden/pending-gifts/${giftId}/plant`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ x, y }),
  });
  if (!res.ok) throw new Error("Failed to plant gift");
  return res.json();
}

export async function giftSeed(toUserId, word) {
  const res = await fetch(`${BASE}/garden/gift`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ to_user_id: toUserId, word }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to gift seed");
  }
  return res.json();
}
