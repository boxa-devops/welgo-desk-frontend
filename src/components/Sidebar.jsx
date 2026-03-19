import './Sidebar.css';

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800000) return 'Вчера';
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

export default function Sidebar({ sessions, activeId, onNewChat, onSelect, onDelete }) {
  return (
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M22 2L11 13" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          Welgo<span>sk</span>
        </div>
        <div class="sidebar-tagline">AI-поиск туров</div>
      </div>

      <button class="sidebar-new-btn" onClick={onNewChat}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Новый чат
      </button>

      <div class="sidebar-section-label">История</div>

      <div class="sidebar-list">
        {sessions.length === 0 ? (
          <div class="sidebar-empty">Нет истории запросов</div>
        ) : (
          sessions.map(s => (
            <div
              key={s.id}
              class={`sidebar-item${s.id === activeId ? ' active' : ''}`}
              onClick={() => onSelect(s.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onSelect(s.id)}
            >
              <div class="sidebar-item-body">
                <div class="sidebar-item-title">{s.title}</div>
                <div class="sidebar-item-date">{formatDate(s.createdAt)}</div>
              </div>
              <button
                class="sidebar-item-del"
                onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                aria-label="Удалить"
                tabIndex={-1}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
