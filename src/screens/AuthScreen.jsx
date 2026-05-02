import { useState } from "react";
import { registerUser, loginUser, saveAuth } from "../api/auth";

export function AuthScreen({ onAuth }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const auth =
        tab === "login"
          ? await loginUser(email, password)
          : await registerUser(name, email, password);
      saveAuth(auth);
      onAuth(auth);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scene auth-wrap">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, lineHeight: 1 }}>🌸</div>
          <div style={{ fontFamily: "'Caprasimo', serif", fontSize: 28, color: "#1c2c19", marginTop: 4 }}>
            Learndo
          </div>
          <div style={{ fontFamily: "'Lilita One', sans-serif", fontSize: 11, color: "#6e4e2c", letterSpacing: "0.06em", marginTop: 2 }}>
            GROW YOUR VOCABULARY
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab${tab === "login" ? " active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>
            LOGIN
          </button>
          <button className={`auth-tab${tab === "register" ? " active" : ""}`} onClick={() => { setTab("register"); setError(""); }}>
            REGISTER
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tab === "register" && (
            <div className="auth-field">
              <label>Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder={tab === "register" ? "At least 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={tab === "register" ? 6 : undefined}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="hd-btn"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? "..." : tab === "login" ? "LOGIN" : "CREATE ACCOUNT"}
          </button>
        </form>
      </div>
    </div>
  );
}
