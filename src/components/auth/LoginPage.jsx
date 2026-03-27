import { useState } from "preact/hooks";
import { supabase } from "../../lib/supabase.js";
import { usePostHog } from "../../lib/posthog.jsx";
import "./LoginPage.css";

export default function LoginPage() {
  const posthog = usePostHog();
  const [tab, setTab] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (tab === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        posthog.capture("user_logged_in");
        // AuthContext will react to onAuthStateChange automatically
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        posthog.capture("user_registered");
        setInfo("Письмо с подтверждением отправлено. Проверьте почту.");
      }
    } catch (err) {
      setError(err.message ?? "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="login-bg">
      <div class="login-card">
        <div class="login-brand">
          <span class="login-logo">W</span>
          <span class="login-title">Welgo Desk</span>
          <span class="login-subtitle">Агентский режим</span>
        </div>

        <div class="login-tabs">
          <button
            class={`login-tab${tab === "login" ? " active" : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
              setInfo("");
            }}
          >
            Войти
          </button>
          <button
            class={`login-tab${tab === "register" ? " active" : ""}`}
            onClick={() => {
              setTab("register");
              setError("");
              setInfo("");
            }}
          >
            Регистрация
          </button>
        </div>

        <form class="login-form" onSubmit={handleSubmit}>
          <div class="login-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@agency.com"
              value={email}
              onInput={(e) => setEmail(e.target.value)}
              required
              autocomplete="email"
            />
          </div>
          <div class="login-field">
            <label>Пароль</label>
            <input
              type="password"
              placeholder={
                tab === "register" ? "Минимум 6 символов" : "••••••••"
              }
              value={password}
              onInput={(e) => setPassword(e.target.value)}
              required
              autocomplete={
                tab === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          {error && <p class="login-error">{error}</p>}
          {info && <p class="login-info">{info}</p>}

          <button class="login-submit" type="submit" disabled={loading}>
            {loading
              ? "Загрузка..."
              : tab === "login"
              ? "Войти"
              : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
}
