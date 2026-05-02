const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function req(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Something went wrong");
  return data;
}

export const registerUser = (name, email, password) =>
  req("/auth/register", { name, email, password });

export const loginUser = (email, password) =>
  req("/auth/login", { email, password });

export const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem("learndo_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveAuth = (auth) =>
  localStorage.setItem("learndo_auth", JSON.stringify(auth));

export const clearAuth = () =>
  localStorage.removeItem("learndo_auth");

export function authHeader() {
  const auth = getStoredAuth();
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}
