import { useState, useRef, useEffect } from 'preact/hooks';
import logo from '../../static/welgo-logo2.png';
import './Sidebar.css';

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800000) return 'Вчера';
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function MiniRing({ credits, max }) {
  const R = 10;
  const SIZE = 28;
  const C = SIZE / 2;
  const circumference = 2 * Math.PI * R;
  const pct = Math.min(1, Math.max(0, credits / max));
  const offset = circumference * (1 - pct);
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} class="sidebar-mini-ring" aria-hidden="true">
      <circle cx={C} cy={C} r={R} fill="none" stroke="#1f2937" stroke-width="3" />
      <circle
        cx={C} cy={C} r={R}
        fill="none"
        stroke="#059669"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray={circumference}
        stroke-dashoffset={offset}
        transform={`rotate(-90 ${C} ${C})`}
        class="sidebar-mini-ring-fill"
      />
    </svg>
  );
}

const DotsIcon = () => (
  <svg viewBox="0 0 16 4" width="13" height="4" fill="currentColor" aria-hidden="true">
    <circle cx="2" cy="2" r="1.5"/>
    <circle cx="8" cy="2" r="1.5"/>
    <circle cx="14" cy="2" r="1.5"/>
  </svg>
);

const PencilIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/>
  </svg>
);

export default function Sidebar({ conversations, activeId, onNewChat, onSelect, onRename, onDelete, profile, activeView, onViewChange }) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const openMenu = (e, id) => {
    e.stopPropagation();
    setMenuOpenId(prev => prev === id ? null : id);
  };

  const startEdit = (e, conv) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setEditingId(conv.id);
    setEditValue(conv.title);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversations.find(c => c.id === editingId)?.title) {
      onRename?.(editingId, trimmed);
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <aside class="sidebar">
      {/* Close menu on outside click */}
      {menuOpenId && (
        <div class="sidebar-backdrop" onClick={() => setMenuOpenId(null)} aria-hidden="true" />
      )}

      <div class="sidebar-header">
        <div class="sidebar-logo">
          <img src={logo} alt="Welgo" class="sidebar-logo-img" />
          <span>Desk</span>
        </div>
        <div class="sidebar-tagline">Агентский режим</div>
      </div>

      <button class="sidebar-new-btn" onClick={onNewChat}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Новый чат
      </button>

      <div class="sidebar-section-label">История</div>

      <div class="sidebar-list">
        {conversations.length === 0 ? (
          <div class="sidebar-empty">Нет истории запросов</div>
        ) : (
          conversations.map(c => (
            <div
              key={c.id}
              class={`sidebar-item${c.id === activeId ? ' active' : ''}`}
              onClick={() => editingId !== c.id && onSelect(c.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && editingId !== c.id && onSelect(c.id)}
            >
              <div class="sidebar-item-body">
                {editingId === c.id ? (
                  <input
                    ref={editInputRef}
                    class="sidebar-item-title-input"
                    value={editValue}
                    onInput={e => setEditValue(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={commitEdit}
                    onClick={e => e.stopPropagation()}
                    maxLength={120}
                    aria-label="Переименовать"
                  />
                ) : (
                  <div class="sidebar-item-title">{c.title}</div>
                )}
                {(c.client_info?.name || c.client_info?.phone) && (
                  <div class="sidebar-client-tag">
                    {[c.client_info.name, c.client_info.phone].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div class="sidebar-item-date">{formatDate(c.updated_at)}</div>
              </div>

              {editingId !== c.id && (
                <div class="sidebar-item-actions">
                  <button
                    class="sidebar-item-menu-btn"
                    onClick={e => openMenu(e, c.id)}
                    aria-label="Действия"
                    aria-expanded={menuOpenId === c.id}
                    tabIndex={-1}
                  >
                    <DotsIcon />
                  </button>

                  {menuOpenId === c.id && (
                    <div class="sidebar-item-menu" role="menu">
                      <button
                        class="sidebar-item-menu-item"
                        role="menuitem"
                        onClick={e => startEdit(e, c)}
                      >
                        <PencilIcon />
                        Переименовать
                      </button>
                      <button
                        class="sidebar-item-menu-item sidebar-item-menu-item--danger"
                        role="menuitem"
                        onClick={e => { e.stopPropagation(); setMenuOpenId(null); onDelete(c.id); }}
                      >
                        <TrashIcon />
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {profile && (
        <button
          class={`sidebar-profile-btn${activeView === 'profile' ? ' active' : ''}`}
          onClick={() => onViewChange(activeView === 'profile' ? 'desk' : 'profile')}
        >
          <div class="sidebar-profile-avatar">{getInitials(profile.full_name)}</div>
          <div class="sidebar-profile-info">
            <div class="sidebar-profile-name">{profile.full_name}</div>
            <div class="sidebar-profile-credits">
              {((profile.credits_limit ?? 300) - (profile.credits_used ?? 0)).toLocaleString('ru')}
              <span class="sidebar-profile-credits-sep">/</span>
              {(profile.credits_limit ?? 300).toLocaleString('ru')}
            </div>
          </div>
          <div class="sidebar-profile-right">
            <MiniRing
              credits={(profile.credits_limit ?? 300) - (profile.credits_used ?? 0)}
              max={profile.credits_limit ?? 300}
            />
          </div>
        </button>
      )}
    </aside>
  );
}
