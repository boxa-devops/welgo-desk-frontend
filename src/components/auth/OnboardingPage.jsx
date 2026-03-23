import { useState } from 'preact/hooks';
import { useAuth } from '../../lib/AuthContext.jsx';
import './OnboardingPage.css';

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M21 2l-9.6 9.6M15.5 7.5l3 3"/>
  </svg>
);

export default function OnboardingPage() {
  const { token, setProfile, signOut } = useAuth();
  const [step, setStep] = useState('choose'); // 'choose' | 'create-org' | 'join'

  // Create org form state
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/register-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ org_name: orgName.trim(), full_name: fullName.trim() }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.detail ?? `Ошибка ${r.status}`);
      }
      const profile = await r.json();
      setProfile({
        profile_id: profile.profile_id,
        org_id: profile.org_id,
        full_name: fullName.trim(),
        role: profile.role,
        credits_balance: profile.credits_balance,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_code: inviteCode.trim(), full_name: fullName.trim() }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.detail ?? `Ошибка ${r.status}`);
      }
      const profile = await r.json();
      setProfile({
        profile_id: profile.profile_id,
        org_id: profile.org_id,
        full_name: fullName.trim(),
        role: profile.role,
        credits_balance: profile.credits_balance,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="onboard-bg">
      <div class="onboard-card">
        <div class="onboard-header">
          <span class="onboard-logo">W</span>
          <h1 class="onboard-title">Добро пожаловать в Welgo Desk</h1>
          <p class="onboard-desc">
            {step === 'choose'
              ? 'Выберите, как вы хотите начать работу'
              : step === 'create-org'
              ? 'Создайте организацию и станьте администратором'
              : 'Введите код приглашения от вашего менеджера'}
          </p>
        </div>

        {step === 'choose' && (
          <div class="onboard-choices">
            <button class="onboard-choice" onClick={() => setStep('create-org')}>
              <span class="onboard-choice-icon onboard-choice-icon--brand"><BuildingIcon /></span>
              <div class="onboard-choice-text">
                <strong>Создать организацию</strong>
                <span>Вы — руководитель агентства. Пригласите агентов после регистрации.</span>
              </div>
              <span class="onboard-choice-arrow">→</span>
            </button>
            <button class="onboard-choice" onClick={() => setStep('join')}>
              <span class="onboard-choice-icon onboard-choice-icon--accent"><KeyIcon /></span>
              <div class="onboard-choice-text">
                <strong>Присоединиться по коду</strong>
                <span>У вас есть код приглашения от руководителя.</span>
              </div>
              <span class="onboard-choice-arrow">→</span>
            </button>
          </div>
        )}

        {step === 'create-org' && (
          <form class="onboard-form" onSubmit={handleCreateOrg}>
            <div class="onboard-field">
              <label>Название агентства</label>
              <input
                type="text"
                placeholder="Солнечный тур"
                value={orgName}
                onInput={e => setOrgName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div class="onboard-field">
              <label>Ваше имя</label>
              <input
                type="text"
                placeholder="Иван Иванов"
                value={fullName}
                onInput={e => setFullName(e.target.value)}
                required
              />
            </div>
            {error && <p class="onboard-error">{error}</p>}
            <div class="onboard-actions">
              <button type="button" class="onboard-back" onClick={() => { setStep('choose'); setError(''); }}>
                ← Назад
              </button>
              <button type="submit" class="onboard-submit" disabled={loading}>
                {loading ? 'Создаём...' : 'Создать организацию'}
              </button>
            </div>
          </form>
        )}

        {step === 'join' && (
          <form class="onboard-form" onSubmit={handleJoin}>
            <div class="onboard-field">
              <label>Ваше имя</label>
              <input
                type="text"
                placeholder="Иван Иванов"
                value={fullName}
                onInput={e => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div class="onboard-field">
              <label>Код приглашения</label>
              <input
                type="text"
                placeholder="XXXX-XXXX"
                value={inviteCode}
                onInput={e => setInviteCode(e.target.value)}
                required
                style="letter-spacing: 2px; font-family: monospace; font-size: 16px;"
              />
            </div>
            {error && <p class="onboard-error">{error}</p>}
            <div class="onboard-actions">
              <button type="button" class="onboard-back" onClick={() => { setStep('choose'); setError(''); }}>
                ← Назад
              </button>
              <button type="submit" class="onboard-submit" disabled={loading}>
                {loading ? 'Присоединяемся...' : 'Присоединиться'}
              </button>
            </div>
          </form>
        )}

        <button class="onboard-signout" onClick={signOut}>Выйти из аккаунта</button>
      </div>
    </div>
  );
}
