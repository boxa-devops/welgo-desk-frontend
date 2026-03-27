import { useState, useEffect } from "preact/hooks";
import { useAuth } from "../lib/AuthContext.jsx";
import { apiFetch } from "../lib/api.js";
import "./ProfilePage.css";
import { usePostHog } from "../lib/posthog.jsx";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function RoleLabel({ role }) {
  const map = {
    admin: "Администратор",
    manager: "Менеджер",
    agent: "Агент",
  };
  return (
    <span class={`pp-role-badge pp-role-badge--${role}`}>
      {map[role] ?? role}
    </span>
  );
}

// ── Plan card ──────────────────────────────────────────────────────────────

const PLAN_META = {
  solo: { label: "SOLO", price: 39, accent: "#6b7280" },
  team: { label: "TEAM", price: 99, accent: "#059669" },
  enterprise: { label: "ENTERPRISE", price: 249, accent: "#7c3aed" },
};

function PlanCard({ profile }) {
  const plan = profile?.plan ?? "solo";
  const meta = PLAN_META[plan] ?? PLAN_META.solo;
  const used = profile?.credits_used ?? 0;
  const limit = profile?.credits_limit ?? 300;
  const seatsU = profile?.seats_used ?? 1;
  const seatsL = profile?.seats_limit ?? 1;
  const resetAt = profile?.credits_reset_at
    ? new Date(profile.credits_reset_at)
    : null;
  const pctUsed =
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div class="pp-plan-card pp-card">
      <div class="pp-plan-header">
        <span class="pp-plan-badge" style={{ background: meta.accent }}>
          {meta.label}
        </span>
        <span class="pp-plan-price">
          ${meta.price}
          <span class="pp-plan-per">/мес</span>
        </span>
      </div>

      <div class="pp-plan-stats">
        <div class="pp-plan-stat">
          <div class="pp-plan-stat-val">
            {used.toLocaleString("ru")} / {limit.toLocaleString("ru")}
          </div>
          <div class="pp-plan-stat-label">Поисков использовано</div>
          <div class="pp-plan-bar">
            <div
              class={`pp-plan-bar-fill${
                pctUsed >= 90 ? " pp-plan-bar-fill--warn" : ""
              }`}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
        </div>

        <div class="pp-plan-stat-divider" />

        <div class="pp-plan-stat">
          <div class="pp-plan-stat-val">
            {seatsU} / {seatsL}
          </div>
          <div class="pp-plan-stat-label">Мест в команде</div>
        </div>

        {resetAt && (
          <>
            <div class="pp-plan-stat-divider" />
            <div class="pp-plan-stat">
              <div class="pp-plan-stat-val">
                {resetAt.toLocaleDateString("ru", {
                  day: "numeric",
                  month: "short",
                })}
              </div>
              <div class="pp-plan-stat-label">Сброс лимита</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Invite section ─────────────────────────────────────────────────────────

function InviteSection() {
  const posthog = usePostHog();
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch("/api/admin/invite", { method: "POST" });
      if (r.ok) {
        const data = await r.json();
        posthog.capture("invite_code_generated");
        setCode(data.invite_code);
        setCopied(false);
      } else {
        const data = await r.json().catch(() => ({}));
        setError(data.detail ?? "Ошибка генерации");
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!code) return;
    posthog.capture("invite_code_copied");
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="pp-card pp-invite-card">
      <div class="pp-invite-top">
        <div class="pp-invite-desc">
          Сгенерируйте одноразовый код для приглашения нового агента в
          организацию.
        </div>
        <button class="pp-invite-btn" onClick={generate} disabled={loading}>
          {loading ? "Генерация…" : "Создать приглашение"}
        </button>
      </div>
      {error && <div class="pp-invite-error">{error}</div>}
      {code && (
        <div class="pp-invite-result">
          <span class="pp-invite-code">{code}</span>
          <button class="pp-invite-copy" onClick={copy} title="Скопировать">
            {copied ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="15"
                height="15"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="15"
                height="15"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Team section ───────────────────────────────────────────────────────────

function TeamSection() {
  const [team, setTeam] = useState(null);

  useEffect(() => {
    apiFetch("/api/admin/team")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTeam)
      .catch(() => setTeam([]));
  }, []);

  if (!team) {
    return <div class="pp-team-loading">Загрузка…</div>;
  }

  return (
    <div class="pp-card pp-team-card">
      {team.map((agent, i) => (
        <div key={agent.profile_id}>
          {i > 0 && <div class="pp-info-divider" />}
          <div class="pp-team-row">
            <div class="pp-team-left">
              <div class="pp-team-name">{agent.full_name}</div>
              <div class="pp-team-meta">
                <span class={`pp-role-badge pp-role-badge--${agent.role}`}>
                  {agent.role === "admin" ? "Администратор" : "Агент"}
                </span>
                <span class="pp-team-searches">
                  {agent.total_searches} поисков
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
      {team.length === 0 && (
        <div class="pp-team-empty">Нет участников в организации</div>
      )}
    </div>
  );
}

// ── Credits ring ───────────────────────────────────────────────────────────

function CreditsRing({ used, limit }) {
  const remaining = Math.max(0, limit - used);
  const R = 52;
  const SIZE = 120;
  const C = SIZE / 2;
  const circumference = 2 * Math.PI * R;
  const pct = limit > 0 ? Math.min(1, remaining / limit) : 0;
  const offset = circumference * (1 - pct);
  const color = pct < 0.15 ? "#ef4444" : pct < 0.3 ? "#f59e0b" : "var(--brand)";

  return (
    <div class="pp-credits-ring-card">
      <div class="pp-credits-ring-wrap">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
        >
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="var(--brand-light)"
            stroke-width="10"
          />
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke={color}
            stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray={circumference}
            stroke-dashoffset={offset}
            transform={`rotate(-90 ${C} ${C})`}
            class="pp-ring-progress"
          />
        </svg>
        <div class="pp-ring-center">
          <span class="pp-ring-value">{remaining.toLocaleString("ru")}</span>
          <span class="pp-ring-unit">поисков</span>
        </div>
      </div>
      <div class="pp-credits-ring-info">
        <div class="pp-credits-ring-title">Остаток поисков</div>
        <div class="pp-credits-ring-sub">
          <span class="pp-credits-ring-pct">{used.toLocaleString("ru")}</span>
          {" из "}
          {limit.toLocaleString("ru")} использовано
        </div>
        <div class="pp-credits-ring-hint">
          Расходуются при каждом поиске. Сбрасываются ежемесячно.
        </div>
      </div>
    </div>
  );
}

// ── ProfilePage ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const posthog = usePostHog();
  const { profile, session, signOut } = useAuth();

  const email = session?.user?.email ?? "—";
  const name = profile?.full_name ?? "—";
  const role = profile?.role ?? "";

  return (
    <div class="pp-root">
      <div class="pp-container">
        <div class="pp-page-header">
          <h1 class="pp-page-title">Профиль</h1>
          <p class="pp-page-sub">Информация об аккаунте и использовании</p>
        </div>

        {/* User card */}
        <div class="pp-card pp-user-card">
          <div class="pp-avatar" aria-hidden="true">
            {getInitials(name)}
          </div>
          <div class="pp-user-info">
            <div class="pp-user-name">{name}</div>
            <div class="pp-user-email">{email}</div>
            {role && <RoleLabel role={role} />}
          </div>
        </div>

        {/* Plan */}
        <div class="pp-section-label">Тариф</div>
        <PlanCard profile={profile} />

        {/* Credits ring */}
        <div class="pp-section-label">Использование</div>
        <div class="pp-card pp-credits-card">
          <CreditsRing
            used={profile?.credits_used ?? 0}
            limit={profile?.credits_limit ?? 300}
          />
        </div>

        {/* Account info */}
        <div class="pp-section-label">Аккаунт</div>
        <div class="pp-card pp-info-card">
          <div class="pp-info-row">
            <span class="pp-info-key">Email</span>
            <span class="pp-info-val">{email}</span>
          </div>
          <div class="pp-info-divider" />
          <div class="pp-info-row">
            <span class="pp-info-key">ID профиля</span>
            <span class="pp-info-val pp-info-val--mono">
              {profile?.profile_id ?? "—"}
            </span>
          </div>
          <div class="pp-info-divider" />
          <div class="pp-info-row">
            <span class="pp-info-key">Организация</span>
            <span class="pp-info-val pp-info-val--mono">
              {profile?.org_id ?? "—"}
            </span>
          </div>
        </div>

        {/* Team + Invite (admin only) */}
        {role === "admin" && (
          <>
            <div class="pp-section-label">Приглашение</div>
            <InviteSection />
            <div class="pp-section-label">Команда</div>
            <TeamSection />
          </>
        )}

        <button
          class="pp-signout-btn"
          onClick={() => {
            posthog.capture("user_signed_out");
            signOut();
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
