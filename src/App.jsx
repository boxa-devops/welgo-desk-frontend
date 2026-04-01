import { useState, useEffect, useCallback } from "preact/hooks";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import { I18nProvider, useI18n } from "./lib/i18n/index.jsx";
import { apiFetch } from "./lib/api.js";
import LoginPage from "./components/auth/LoginPage.jsx";
import OnboardingPage from "./components/auth/OnboardingPage.jsx";
import Sidebar from "./components/Sidebar.jsx";
import DeskView from "./components/desk/DeskView.jsx";
import ProfilePage from "./components/ProfilePage.jsx";
import SuperAdminPage from "./components/SuperAdminPage.jsx";
import "./App.css";
import { usePostHog } from "./lib/posthog.jsx";

function PendingApprovalPage({ profile, signOut }) {
  const { t } = useI18n();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "12px",
        color: "var(--text)",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div style={{ fontSize: "40px" }}>⏳</div>
      <h2 style={{ margin: 0, fontWeight: 800, fontSize: "20px" }}>
        {t("pending.title")}
      </h2>
      <p
        style={{
          margin: 0,
          color: "var(--muted)",
          fontSize: "14px",
          maxWidth: "360px",
        }}
        dangerouslySetInnerHTML={{ __html: t("pending.desc", { org: profile.org_name }) }}
      />
      <button
        onClick={signOut}
        style={{
          marginTop: "8px",
          padding: "8px 20px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--muted)",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        {t("pending.signout")}
      </button>
    </div>
  );
}

function AppShell() {
  const { session, profile, profileLoading, signOut } = useAuth();
  const { setLang } = useI18n();
  const posthog = usePostHog();

  // Sync i18n language with profile
  useEffect(() => {
    if (profile?.language) setLang(profile.language);
  }, [profile?.language]);
  const [conversations, setConversations] = useState([]);
  const [activeView, setActiveView] = useState(() => {
    if (window.location.hash === "#superadmin") return "superadmin";
    return sessionStorage.getItem("activeView") ?? "desk";
  });

  const handleViewChange = useCallback((view) => {
    sessionStorage.setItem("activeView", view);
    setActiveView(view);
  }, []);

  useEffect(() => {
    if (profile?.profile_id && session) {
      posthog.identify(profile.profile_id, {
        email: session.user.email,
        name: profile.full_name,
        role: profile.role,
        org_id: profile.org_id,
        plan: profile.plan,
      });
    }
  }, [profile?.profile_id]);
  const [currentSessionId, setCurrentSessionId] = useState(() => crypto.randomUUID());

  const refreshConversations = useCallback(() => {
    apiFetch("/api/desk/conversations")
      .then((r) => (r.ok ? r.json() : []))
      .then(setConversations)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (session && profile) refreshConversations();
  }, [session, profile]);

  const switchSession = useCallback((id) => {
    setCurrentSessionId(id);
    handleViewChange("desk");
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(crypto.randomUUID());
    handleViewChange("desk");
    posthog.capture("conversation_new");
  }, []);

  const handleSelect = useCallback(
    (id) => {
      posthog.capture("conversation_selected");
      switchSession(id);
    },
    [switchSession]
  );

  const handleRename = useCallback((id, title) => {
    posthog.capture("conversation_renamed");
    apiFetch(`/api/desk/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(console.error);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }, []);

  const handleDelete = useCallback((id) => {
    posthog.capture("conversation_deleted");
    apiFetch(`/api/desk/conversations/${id}`, { method: "DELETE" }).catch(
      console.error
    );
    setConversations((prev) => prev.filter((c) => c.id !== id));
    // If deleting the active session, open a new blank one
    setCurrentSessionId((prev) => prev === id ? crypto.randomUUID() : prev);
  }, []);

  // ── Auth gate ─────────────────────────────────────────────────────────────

  if (session === undefined) {
    return (
      <div class="app-loading">
        <span class="app-loading-dot" />
      </div>
    );
  }
  if (!session) return <LoginPage />;
  if (profileLoading) {
    return (
      <div class="app-loading">
        <span class="app-loading-dot" />
      </div>
    );
  }
  if (!profile) return <OnboardingPage />;
  if (profile.is_enabled === false)
    return <PendingApprovalPage profile={profile} signOut={signOut} />;

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div class="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={currentSessionId}
        onNewChat={handleNewChat}
        onSelect={handleSelect}
        onRename={handleRename}
        onDelete={handleDelete}
        profile={profile}
        activeView={activeView}
        onViewChange={handleViewChange}
      />
      <div class="main-content">
        {activeView === "superadmin" && <SuperAdminPage />}
        {activeView === "profile" && <ProfilePage />}
        <div class={`session-slot${activeView === "desk" ? " session-slot--active" : ""}`}>
          <DeskView key={currentSessionId} sessionId={currentSessionId} onTurnComplete={refreshConversations} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <AppShell />
      </I18nProvider>
    </AuthProvider>
  );
}
