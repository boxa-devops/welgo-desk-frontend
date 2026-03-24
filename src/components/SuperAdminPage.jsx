import { useState, useEffect } from 'preact/hooks';
import { apiFetch } from '../lib/api.js';
import './SuperAdminPage.css';

export default function SuperAdminPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/superadmin/allowlist');
      if (r.status === 403) { setForbidden(true); return; }
      setEntries(await r.json());
    } catch {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setAdding(true);
    try {
      const r = await apiFetch('/api/superadmin/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, note: note.trim() || null }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.detail ?? `Ошибка ${r.status}`);
      } else {
        setEmail('');
        setNote('');
        await load();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (entryEmail) => {
    if (!confirm(`Удалить ${entryEmail}?`)) return;
    const r = await apiFetch(`/api/superadmin/allowlist/${encodeURIComponent(entryEmail)}`, {
      method: 'DELETE',
    });
    if (r.ok || r.status === 204) {
      setEntries(prev => prev.filter(e => e.email !== entryEmail));
    } else {
      setError(`Не удалось удалить ${entryEmail}`);
    }
  };

  if (forbidden) {
    return (
      <div class="sa-root">
        <div class="sa-forbidden">
          <span class="sa-forbidden-icon">🔒</span>
          <p>Доступ запрещён</p>
        </div>
      </div>
    );
  }

  return (
    <div class="sa-root">
      <div class="sa-container">
        <div class="sa-header">
          <h1 class="sa-title">Allowlist</h1>
          <p class="sa-sub">Управление доступом к регистрации агентств</p>
        </div>

        {/* Add form */}
        <form class="sa-card sa-add-form" onSubmit={handleAdd}>
          <div class="sa-form-row">
            <input
              class="sa-input"
              type="text"
              placeholder="email@agency.uz или @agency.uz"
              value={email}
              onInput={e => setEmail(e.target.value)}
              disabled={adding}
            />
            <input
              class="sa-input sa-input--note"
              type="text"
              placeholder="Примечание (необязательно)"
              value={note}
              onInput={e => setNote(e.target.value)}
              disabled={adding}
            />
            <button class="sa-btn sa-btn--add" type="submit" disabled={adding || !email.trim()}>
              {adding ? '…' : 'Добавить'}
            </button>
          </div>
          {error && <p class="sa-error">{error}</p>}
        </form>

        {/* Entries list */}
        <div class="sa-card sa-list">
          {loading ? (
            <div class="sa-loading">Загрузка…</div>
          ) : entries.length === 0 ? (
            <div class="sa-empty">Список пуст — добавьте первое агентство</div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} class="sa-entry">
                <div class="sa-entry-left">
                  <span class="sa-entry-email">{entry.email}</span>
                  {entry.note && <span class="sa-entry-note">{entry.note}</span>}
                </div>
                <div class="sa-entry-right">
                  {entry.is_registered
                    ? <span class="sa-badge sa-badge--registered">Зарегистрирован</span>
                    : <span class="sa-badge sa-badge--pending">Ожидает</span>
                  }
                  <span class="sa-entry-date">
                    {new Date(entry.created_at).toLocaleDateString('ru')}
                  </span>
                  <button
                    class="sa-btn sa-btn--delete"
                    onClick={() => handleDelete(entry.email)}
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
