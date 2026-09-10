import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../layout/AuthContext";
import { Button } from "../components/ui";
import { errorMessage } from "../components/ErrorState";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-brand">
          <div className="brand-mark">
            <BookOpen size={22} />
          </div>
          <strong>LibraERP</strong>
        </div>
        <div className="login-quote">
          <span>LIBRARY OPERATIONS</span>
          <h1>
            One place to run
            <br />
            your entire library.
          </h1>
          <p>
            Circulation, members, catalogue, fines and operational insight in
            one calm workspace.
          </p>
        </div>
        <div className="login-stat">
          <strong>ERP workspace</strong>
          <span>Role-aware tools built around your library workflow.</span>
        </div>
      </div>
      <div className="login-card">
        <div className="mobile-logo">
          <BookOpen size={24} />
          <strong>LibraERP</strong>
        </div>
        <div className="login-head">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your library</h2>
          <p>Use your staff account to continue.</p>
        </div>
        <form onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <div className="input-icon">
              <Mail size={17} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@library.edu"
              />
            </div>
          </label>
          <label className="field">
            <span>Password</span>
            <div className="input-icon">
              <LockKeyhole size={17} />
              <input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" loading={busy}>
            Sign in
          </Button>
        </form>
        <p className="login-note">
          Authentication is handled by the existing API with an HttpOnly refresh
          cookie.
        </p>
      </div>
    </div>
  );
}
