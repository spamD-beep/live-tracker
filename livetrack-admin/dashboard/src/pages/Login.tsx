import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail, MapPin, Radio, UserRound } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import "./Login.css";
import "./LoginOverrides.css";

export function Login() {
  const state = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (state.user) return <Navigate to="/" />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        await api.post("/auth/register", { fullName, email, password });
      }
      const { data } = await api.post("/auth/login", { email, password });
      state.setAuth(data.user, data.accessToken, data.refreshToken);
      navigate("/");
    } catch (requestError: any) {
      setError(requestError.response?.data?.error ?? `Unable to ${mode === "login" ? "sign in" : "create account"}`);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError("");
    if (nextMode === "signup") {
      setEmail("");
      setPassword("");
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <img src="/auth-world-map.png" alt="Connected world map with live location markers" />
        <div className="auth-visual-shade" />
        <div className="auth-brand"><span><Radio /></span> LiveTrack <b>Admin</b></div>
        <div className="auth-hero-copy">
          <span className="auth-kicker"><MapPin /> CONSENT-BASED LIVE OPERATIONS</span>
          <h1>Every authorized device.<br />One clear view.</h1>
          <p>Secure, real-time location visibility for teams that move.</p>
        </div>
        <div className="auth-visual-foot">
          <i />
          Live fleet data is encrypted, audited, and permission controlled
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-mobile-brand"><Radio /> LiveTrack Admin</div>
          <span className="auth-kicker">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span>
          <h2>{mode === "login" ? "Log in to your account" : "Create your account"}</h2>
          <p>{mode === "login" ? "Monitor authorized devices with role-based access and audit protection." : "Register for secure, consent-first location operations."}</p>

          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>Log in</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>Sign up</button>
          </div>

          {mode === "signup" && (
            <label>
              Full name
              <span className="auth-input"><UserRound /><input value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Your full name" minLength={2} required /></span>
            </label>
          )}
          <label>
            Email address
            <span className="auth-input"><Mail /><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@company.com" required /></span>
          </label>
          <label>
            Password
            <span className="auth-input"><LockKeyhole /><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button></span>
          </label>

          {mode === "login" && (
            <div className="auth-options">
              <label><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Remember me</label>
              <button type="button">Forgot password?</button>
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </section>
    </div>
  );
}
