import { useState, useEffect, useCallback } from "preact/hooks";
import { useAuth } from "../lib/AuthContext.jsx";
import { useI18n } from "../lib/i18n/index.jsx";
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
  const { t } = useI18n();
  const map = {
    admin: t("profile.role_admin"),
    manager: t("profile.role_manager"),
    agent: t("profile.role_agent"),
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
  const { t, lang } = useI18n();
  const locale = lang === "uz" ? "uz" : "ru";
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
          <span class="pp-plan-per">{t("profile.per_month")}</span>
        </span>
      </div>

      <div class="pp-plan-stats">
        <div class="pp-plan-stat">
          <div class="pp-plan-stat-val">
            {used.toLocaleString(locale)} / {limit.toLocaleString(locale)}
          </div>
          <div class="pp-plan-stat-label">{t("profile.searches_used")}</div>
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
          <div class="pp-plan-stat-label">{t("profile.team_seats")}</div>
        </div>

        {resetAt && (
          <>
            <div class="pp-plan-stat-divider" />
            <div class="pp-plan-stat">
              <div class="pp-plan-stat-val">
                {resetAt.toLocaleDateString(locale, {
                  day: "numeric",
                  month: "short",
                })}
              </div>
              <div class="pp-plan-stat-label">{t("profile.limit_reset")}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Language selector ─────────────────────────────────────────────────────

function LanguageSelector() {
  const { t, lang, setLang } = useI18n();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback(async (newLang) => {
    if (newLang === lang) return;
    setSaving(true);
    try {
      const r = await apiFetch("/api/auth/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLang }),
      });
      if (r.ok) {
        setLang(newLang);
        // Mutate in-place to avoid triggering full profile re-render cascade
        if (profile) profile.language = newLang;
      }
    } finally {
      setSaving(false);
    }
  }, [lang, profile]);

  return (
    <div class="pp-lang-selector">
      <button
        class={`pp-lang-btn${lang === "ru" ? " pp-lang-btn--active" : ""}`}
        onClick={() => handleChange("ru")}
        disabled={saving}
      >
        {t("profile.language_ru")}
      </button>
      <button
        class={`pp-lang-btn${lang === "uz" ? " pp-lang-btn--active" : ""}`}
        onClick={() => handleChange("uz")}
        disabled={saving}
      >
        {t("profile.language_uz")}
      </button>
    </div>
  );
}

// ── Invite section ─────────────────────────────────────────────────────────

function InviteSection() {
  const { t } = useI18n();
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
        setError(data.detail ?? t("profile.invite_error"));
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
        <div class="pp-invite-desc">{t("profile.invite_desc")}</div>
        <button class="pp-invite-btn" onClick={generate} disabled={loading}>
          {loading ? t("profile.invite_generating") : t("profile.invite_btn")}
        </button>
      </div>
      {error && <div class="pp-invite-error">{error}</div>}
      {code && (
        <div class="pp-invite-result">
          <span class="pp-invite-code">{code}</span>
          <button class="pp-invite-copy" onClick={copy} title={t("quote.copy")}>
            {copied ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Team section ───────────────────────────────────────────────────────────

function TeamSection() {
  const { t } = useI18n();
  const [team, setTeam] = useState(null);

  useEffect(() => {
    apiFetch("/api/admin/team")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTeam)
      .catch(() => setTeam([]));
  }, []);

  if (!team) {
    return <div class="pp-team-loading">{t("profile.team_loading")}</div>;
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
                  {agent.role === "admin" ? t("profile.role_admin") : t("profile.role_agent")}
                </span>
                <span class="pp-team-searches">
                  {agent.total_searches} {t("profile.team_searches")}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
      {team.length === 0 && (
        <div class="pp-team-empty">{t("profile.team_empty")}</div>
      )}
    </div>
  );
}

// ── Credits ring ───────────────────────────────────────────────────────────

function CreditsRing({ used, limit }) {
  const { t, lang } = useI18n();
  const locale = lang === "uz" ? "uz" : "ru";
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
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--brand-light)" stroke-width="10" />
          <circle cx={C} cy={C} r={R} fill="none" stroke={color} stroke-width="10" stroke-linecap="round" stroke-dasharray={circumference} stroke-dashoffset={offset} transform={`rotate(-90 ${C} ${C})`} class="pp-ring-progress" />
        </svg>
        <div class="pp-ring-center">
          <span class="pp-ring-value">{remaining.toLocaleString(locale)}</span>
          <span class="pp-ring-unit">{t("profile.searches_unit")}</span>
        </div>
      </div>
      <div class="pp-credits-ring-info">
        <div class="pp-credits-ring-title">{t("profile.remaining_searches")}</div>
        <div class="pp-credits-ring-sub">
          <span class="pp-credits-ring-pct">{used.toLocaleString(locale)}</span>
          {` ${t("profile.of")} `}
          {limit.toLocaleString(locale)} {t("profile.used")}
        </div>
        <div class="pp-credits-ring-hint">{t("profile.credits_hint")}</div>
      </div>
    </div>
  );
}

// ── ProfilePage ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useI18n();
  const posthog = usePostHog();
  const { profile, session, signOut } = useAuth();

  const email = session?.user?.email ?? "—";
  const name = profile?.full_name ?? "—";
  const role = profile?.role ?? "";

  return (
    <div class="pp-root">
      <div class="pp-container">
        <div class="pp-page-header">
          <h1 class="pp-page-title">{t("profile.title")}</h1>
          <p class="pp-page-sub">{t("profile.subtitle")}</p>
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

        {/* Language */}
        <div class="pp-section-label">{t("profile.language")}</div>
        <div class="pp-card">
          <LanguageSelector />
        </div>

        {/* Plan */}
        <div class="pp-section-label">{t("profile.plan")}</div>
        <PlanCard profile={profile} />

        {/* Credits ring */}
        <div class="pp-section-label">{t("profile.usage")}</div>
        <div class="pp-card pp-credits-card">
          <CreditsRing
            used={profile?.credits_used ?? 0}
            limit={profile?.credits_limit ?? 300}
          />
        </div>

        {/* Account info */}
        <div class="pp-section-label">{t("profile.account")}</div>
        <div class="pp-card pp-info-card">
          <div class="pp-info-row">
            <span class="pp-info-key">Email</span>
            <span class="pp-info-val">{email}</span>
          </div>
          <div class="pp-info-divider" />
          <div class="pp-info-row">
            <span class="pp-info-key">{t("profile.profile_id")}</span>
            <span class="pp-info-val pp-info-val--mono">
              {profile?.profile_id ?? "—"}
            </span>
          </div>
          <div class="pp-info-divider" />
          <div class="pp-info-row">
            <span class="pp-info-key">{t("profile.organization")}</span>
            <span class="pp-info-val pp-info-val--mono">
              {profile?.org_id ?? "—"}
            </span>
          </div>
        </div>

        {/* Team + Invite (admin only) */}
        {role === "admin" && (
          <>
            <div class="pp-section-label">{t("profile.invite")}</div>
            <InviteSection />
            <div class="pp-section-label">{t("profile.team")}</div>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {t("profile.signout")}
        </button>
      </div>
    </div>
  );
}
