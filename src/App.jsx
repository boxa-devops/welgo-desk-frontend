import { useState, useEffect, useCallback } from 'preact/hooks';
import { AuthProvider, useAuth } from './lib/AuthContext.jsx';
import { apiFetch } from './lib/api.js';
import LoginPage from './components/auth/LoginPage.jsx';
import OnboardingPage from './components/auth/OnboardingPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import DeskView from './components/desk/DeskView.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import './App.css';

function AppShell() {
  const { session, profile, profileLoading, signOut } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeView, setActiveView] = useState(() => sessionStorage.getItem('activeView') ?? 'desk');

  const handleViewChange = useCallback((view) => {
    sessionStorage.setItem('activeView', view);
    setActiveView(view);
  }, []);
  // Track all mounted session IDs so DeskViews are never unmounted mid-stream
  const [mountedSessions, setMountedSessions] = useState(() => {
    const id = crypto.randomUUID();
    return { current: id, ids: [id] };
  });

  const currentSessionId = mountedSessions.current;

  const refreshConversations = useCallback(() => {
    apiFetch('/api/desk/conversations')
      .then(r => r.ok ? r.json() : [])
      .then(setConversations)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (session && profile) refreshConversations();
  }, [session, profile]);

  const switchSession = useCallback((id) => {
    setMountedSessions(prev =>
      prev.ids.includes(id)
        ? { ...prev, current: id }
        : { current: id, ids: [...prev.ids, id] }
    );
    handleViewChange('desk');
  }, []);

  const handleNewChat = useCallback(() => {
    const id = crypto.randomUUID();
    setMountedSessions(prev => ({ current: id, ids: [...prev.ids, id] }));
    handleViewChange('desk');
  }, []);

  const handleSelect = useCallback((id) => switchSession(id), [switchSession]);

  const handleRename = useCallback((id, title) => {
    apiFetch(`/api/desk/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(console.error);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  }, []);

  const handleDelete = useCallback((id) => {
    apiFetch(`/api/desk/conversations/${id}`, { method: 'DELETE' }).catch(console.error);
    setConversations(prev => prev.filter(c => c.id !== id));
    // Unmount deleted session; if active, open a new blank one
    setMountedSessions(prev => {
      const ids = prev.ids.filter(s => s !== id);
      if (prev.current !== id) return { current: prev.current, ids };
      const next = crypto.randomUUID();
      return { current: next, ids: [...ids, next] };
    });
  }, []);

  // ── Auth gate ─────────────────────────────────────────────────────────────

  if (session === undefined) {
    return <div class="app-loading"><span class="app-loading-dot" /></div>;
  }
  if (!session) return <LoginPage />;
  if (profileLoading) {
    return <div class="app-loading"><span class="app-loading-dot" /></div>;
  }
  if (!profile) return <OnboardingPage />;

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
        {activeView === 'profile' && <ProfilePage />}
        {mountedSessions.ids.map(id => (
          <div
            key={id}
            class={`session-slot${activeView === 'desk' && id === currentSessionId ? ' session-slot--active' : ''}`}
          >
            <DeskView
              sessionId={id}
              onTurnComplete={refreshConversations}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
