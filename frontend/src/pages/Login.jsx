import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../shared/api.js";
import { saveSession } from "../shared/auth.js";
import logoUrl from "../../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(username, password);
      saveSession(data.token, data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="login-heading">
          <img className="brand-logo large" src={logoUrl} alt="Swapna Grand logo" />
          <div>
            <h1>Swapna Grand</h1>
            <p>Secure check-in record system</p>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}

        <label>
          Username
          <span className="input-icon">
            <User size={18} />
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </span>
        </label>

        <label>
          Password
          <span className="input-icon">
            <Lock size={18} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>

        <button className="primary-button" disabled={loading} type="submit">
          <LogIn size={18} /> {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
