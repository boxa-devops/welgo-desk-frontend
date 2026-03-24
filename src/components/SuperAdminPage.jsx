import { useState, useEffect } from 'preact/hooks';
import { apiFetch } from '../lib/api.js';
import './SuperAdminPage.css';

const PLANS = [
  { key: 'solo',       label: 'SOLO',       price: '$39/мес',  credits: 300,   seats: 1  },
  { key: 'team',       label: 'TEAM',       price: '$99/мес',  credits: 1500,  seats: 5  },
  { key: 'enterprise', label: 'ENTERPRISE', price: '$249/мес', credits: 10000, seats: 15 },
];

function PlanSelect({ orgId, current, onUpdated }) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  const handleChange = async (e) => {
    const plan = e.target.value;
    setValue(plan);
    setSaving(true);
    try {
      const r = await apiFetch(`/api/superadmin/orgs/${orgId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (r.ok) onUpdated(orgId, { plan, ...(await r.json()) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <select class={`sa-select${saving ? ' sa-select--saving' : ''}`} value={value} onChange={handleChange} disabled={saving}>
      {PLANS.map(p => (
        <option key={p.key} value={p.key}>{p.label} — {p.price}</option>
      ))}
    </select>
  );
}

function EnableToggle({ orgId, enabled, onUpdated }) {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/superadmin/orgs/${orgId}/enable`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !enabled }),
      });
      if (r.ok) onUpdated(orgId, { is_enabled: !enabled });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      class={`sa-toggle${enabled ? ' sa-toggle--on' : ' sa-toggle--off'}`}
      onClick={toggle}
      disabled={loading}
      title={enabled ? 'Отключить' : 'Включить'}
    >
      {loading ? '…' : enabled ? 'Активен' : 'Ожидает'}
    </button>
  );
}

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    apiFetch('/api/superadmin/orgs')
      .then(r => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setOrgs(data); })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdated = (orgId, patch) => {
    setOrgs(prev => prev.map(o => o.org_id === orgId ? { ...o, ...patch } : o));
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

  const pending = orgs.filter(o => !o.is_enabled);
  const active  = orgs.filter(o => o.is_enabled);

  return (
    <div class="sa-root">
      <div class="sa-container">
        <div class="sa-header">
          <h1 class="sa-title">Агентства</h1>
          <p class="sa-sub">{orgs.length} зарег. · {pending.length} ожидает · {active.length} активных</p>
        </div>

        {loading ? (
          <div class="sa-loading">Загрузка…</div>
        ) : orgs.length === 0 ? (
          <div class="sa-empty">Нет зарегистрированных агентств</div>
        ) : (
          <div class="sa-card sa-list">
            {orgs.map(org => (
              <div key={org.org_id} class={`sa-entry${!org.is_enabled ? ' sa-entry--pending' : ''}`}>
                <div class="sa-entry-left">
                  <span class="sa-entry-name">{org.org_name}</span>
                  {org.admin_name && (
                    <span class="sa-entry-meta">{org.admin_name}</span>
                  )}
                  <span class="sa-entry-meta">
                    {org.credits_used} / {org.credits_limit} поисков · {org.seats_used} / {org.seats_limit} мест · {new Date(org.created_at).toLocaleDateString('ru')}
                  </span>
                </div>
                <div class="sa-entry-right">
                  <PlanSelect orgId={org.org_id} current={org.plan} onUpdated={handleUpdated} />
                  <EnableToggle orgId={org.org_id} enabled={org.is_enabled} onUpdated={handleUpdated} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
