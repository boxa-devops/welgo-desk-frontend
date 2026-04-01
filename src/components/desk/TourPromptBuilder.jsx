import { useState, useCallback, useEffect, useMemo } from 'preact/hooks';
import { apiFetch } from '../../lib/api.js';
import './TourPromptBuilder.css';

// ─────────────────────────────────────────────────────────────────────────────
// Config (mirrors backend prompt_generator.py)
// ─────────────────────────────────────────────────────────────────────────────

const DESTINATIONS = [
  { value: 'turkey',   label: 'Турция' },
  { value: 'uae',      label: 'ОАЭ' },
  { value: 'egypt',    label: 'Египет' },
  { value: 'thailand', label: 'Таиланд' },
  { value: 'maldives', label: 'Мальдивы' },
  { value: 'domestic', label: 'Внутренний туризм' },
  { value: 'custom',   label: '+ Своё' },
];

const DEPARTURE_CITIES = [
  'Ташкент', 'Самарканд', 'Бухара', 'Наманган',
  'Андижан', 'Фергана', 'Нукус', 'Термез',
  'Карши', 'Навои', 'Ургенч',
];

const MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

const DURATIONS = [7, 10, 14];

const BUDGETS = [
  { value: 'economy', label: 'Эконом',  sub: 'до $800' },
  { value: 'comfort', label: 'Комфорт', sub: '$800–1800' },
  { value: 'luxury',  label: 'Люкс',    sub: 'от $1800' },
];

const VIBES = [
  { value: 'beach',      label: '🏖 Пляжный' },
  { value: 'excursion',  label: '🏛 Экскурсионный' },
  { value: 'active',     label: '🧗 Активный' },
  { value: 'family',     label: '👨‍👩‍👧 Семейный' },
  { value: 'spa',        label: '💆 SPA & релакс' },
  { value: 'gastro',     label: '🍽 Гастрономический' },
];

// Local instant brief generation (same logic as backend, for real-time preview)
function localBrief(form) {
  const DEST_MAP = { turkey: 'Турция', uae: 'ОАЭ', egypt: 'Египет', thailand: 'Таиланд', maldives: 'Мальдивы', domestic: 'Узбекистан' };
  const BUDGET_MAP = { economy: 'Эконом (до $800)', comfort: 'Комфорт ($800–1800)', luxury: 'Люкс (от $1800)' };
  const VIBE_MAP = { beach: 'пляжный', excursion: 'экскурсионный', active: 'активный', family: 'семейный', spa: 'SPA и релакс', gastro: 'гастрономический' };
  const MONTHS_RU = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];

  const dest = DEST_MAP[form.destination] || form.customDestination || form.destination;
  const month = form.month ? ` в ${MONTHS_RU[form.month - 1]}` : '';
  const people = form.children > 0
    ? `${form.adults} взр. + ${form.children} реб.`
    : `${form.adults} взрослых`;
  const vibes = form.vibes.map(v => VIBE_MAP[v] || v).filter(Boolean).join(', ');
  const budget = BUDGET_MAP[form.budget] || '';
  const extras = form.extraChips?.length ? `Важно: ${form.extraChips.join(', ')}.` : '';

  return [
    `Подбери тур в ${dest} на ${form.duration} ночей${month}`,
    `(вылет из ${form.departureCity}).`,
    `Состав: ${people}.`,
    vibes ? `Формат: ${vibes}.` : '',
    budget ? `Бюджет: ${budget}.` : '',
    extras,
  ].filter(Boolean).join(' ');
}

// Contextual chips based on vibes (mirrors backend CONTEXTUAL_CHIPS)
const CONTEXTUAL_CHIPS = {
  beach: ['Первая линия', 'Песчаный пляж', 'Подогреваемый бассейн', 'Водные горки'],
  family: ['Детский клуб', 'Анимация', 'Мелкий бассейн', 'Детское меню'],
  spa: ['SPA-центр', 'Хаммам', 'Тёплый бассейн', 'Тихая зона'],
  excursion: ['Близко к центру', 'Трансфер', 'Гид на русском'],
  active: ['Дайвинг', 'Снорклинг', 'Водные виды спорта', 'Фитнес-зал'],
  gastro: ['A-la-carte рестораны', 'Ultra All Inclusive', 'Местная кухня'],
};

function getChips(vibes) {
  const seen = new Set();
  const out = [];
  for (const v of vibes) {
    for (const c of CONTEXTUAL_CHIPS[v] || []) {
      if (!seen.has(c)) { out.push(c); seen.add(c); }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Counter({ value, onChange, min = 0, max = 10 }) {
  return (
    <div class="tpb-counter">
      <button
        class="tpb-counter-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        type="button"
        aria-label="Уменьшить"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M5 12h14"/>
        </svg>
      </button>
      <span class="tpb-counter-val">{value}</span>
      <button
        class="tpb-counter-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        type="button"
        aria-label="Увеличить"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div class="tpb-field">
      <label class="tpb-label">{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  destination: 'turkey',
  customDestination: '',
  departureCity: 'Ташкент',
  month: new Date().getMonth() + 1,
  duration: 7,
  adults: 2,
  children: 0,
  budget: 'comfort',
  vibes: ['beach'],
  extraChips: [],
};

export default function TourPromptBuilder({ onSend, onClose }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [preview, setPreview] = useState('');
  const [expertHints, setExpertHints] = useState([]);
  const [strategy, setStrategy] = useState('');
  const [polishing, setPolishing] = useState(false);
  const [edited, setEdited] = useState(false);

  const set = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setEdited(false);
  }, []);

  const toggleVibe = useCallback((v) => {
    setForm(prev => {
      const vibes = prev.vibes.includes(v)
        ? prev.vibes.filter(x => x !== v)
        : [...prev.vibes, v];
      const validChips = getChips(vibes);
      const extraChips = prev.extraChips.filter(c => validChips.includes(c));
      return { ...prev, vibes, extraChips };
    });
    setEdited(false);
  }, []);

  const toggleChip = useCallback((chip) => {
    setForm(prev => {
      const extraChips = prev.extraChips.includes(chip)
        ? prev.extraChips.filter(c => c !== chip)
        : [...prev.extraChips, chip];
      return { ...prev, extraChips };
    });
    setEdited(false);
  }, []);

  // Contextual chips for current vibes
  const contextChips = useMemo(() => getChips(form.vibes), [form.vibes]);

  // Real-time preview + expert hints + strategy from backend
  useEffect(() => {
    if (edited) return;

    // Instant local preview first
    setPreview(localBrief(form));

    // Then call backend for expert layer (debounced)
    const timer = setTimeout(() => {
      apiFetch('/api/desk/prompt-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: form.destination,
          custom_destination: form.customDestination,
          departure_city: form.departureCity,
          month: form.month,
          duration: form.duration,
          adults: form.adults,
          children: form.children,
          budget: form.budget,
          vibes: form.vibes,
          extra_chips: form.extraChips,
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          setPreview(data.brief);
          setExpertHints(data.expert_hints ?? []);
          setStrategy(data.strategy ?? '');
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [form, edited]);

  // AI Polish — call backend
  const handlePolish = async () => {
    if (polishing || !preview) return;
    setPolishing(true);
    try {
      const resp = await apiFetch('/api/desk/prompt-builder/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: preview }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setPreview(data.brief);
        setEdited(true);
      }
    } finally {
      setPolishing(false);
    }
  };

  // Send directly to the agent
  const handleSend = () => {
    const text = preview.trim();
    if (!text) return;
    onSend?.(text);
    onClose?.();
  };

  return (
    <div class="tpb-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div class="tpb-modal" role="dialog" aria-modal="true" aria-label="Конструктор запроса">

        {/* ── Header ── */}
        <div class="tpb-header">
          <div class="tpb-header-left">
            <div class="tpb-header-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div class="tpb-header-title">Конструктор запроса</div>
              <div class="tpb-header-sub">Соберите параметры — MIRA составит подборку</div>
            </div>
          </div>
          <button class="tpb-close-btn" onClick={onClose} type="button" aria-label="Закрыть">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="tpb-body">
          <div class="tpb-fields">

            {/* Destination */}
            <Field label="Направление">
              <div class="tpb-dest-grid">
                {DESTINATIONS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    class={`tpb-dest-btn${form.destination === d.value ? ' active' : ''}${d.value === 'custom' ? ' tpb-dest-btn--custom' : ''}`}
                    onClick={() => set('destination', d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {form.destination === 'custom' && (
                <input
                  class="tpb-custom-dest"
                  type="text"
                  placeholder="Введите направление…"
                  value={form.customDestination}
                  onInput={e => set('customDestination', e.target.value)}
                  autoFocus
                />
              )}
            </Field>

            {/* Departure city + Month row */}
            <div class="tpb-row">
              <Field label="Город вылета">
                <select
                  class="tpb-select"
                  value={form.departureCity}
                  onChange={e => set('departureCity', e.target.value)}
                >
                  {DEPARTURE_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Месяц вылета">
                <select
                  class="tpb-select"
                  value={form.month}
                  onChange={e => set('month', Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Duration row */}
            <div class="tpb-row">
              <Field label="Ночей">
                <div class="tpb-dur-group">
                  {DURATIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      class={`tpb-dur-btn${form.duration === d ? ' active' : ''}`}
                      onClick={() => set('duration', d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Tourists row */}
            <div class="tpb-row">
              <Field label="Взрослые">
                <Counter value={form.adults} onChange={v => set('adults', v)} min={1} />
              </Field>
              <Field label="Дети">
                <Counter value={form.children} onChange={v => set('children', v)} />
              </Field>
            </div>

            {/* Budget */}
            <Field label="Бюджет">
              <div class="tpb-budget-group">
                {BUDGETS.map(b => (
                  <button
                    key={b.value}
                    type="button"
                    class={`tpb-budget-btn${form.budget === b.value ? ' active' : ''}`}
                    onClick={() => set('budget', b.value)}
                  >
                    <span class="tpb-budget-label">{b.label}</span>
                    <span class="tpb-budget-sub">{b.sub}</span>
                  </button>
                ))}
              </div>
            </Field>

            {/* Vibe */}
            <Field label="Тип отдыха">
              <div class="tpb-vibe-group">
                {VIBES.map(v => (
                  <button
                    key={v.value}
                    type="button"
                    class={`tpb-vibe-tag${form.vibes.includes(v.value) ? ' active' : ''}`}
                    onClick={() => toggleVibe(v.value)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* Contextual chips — shown based on selected vibes */}
            {contextChips.length > 0 && (
              <Field label="Дополнительно">
                <div class="tpb-chips-group">
                  {contextChips.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      class={`tpb-context-chip${form.extraChips.includes(chip) ? ' active' : ''}`}
                      onClick={() => toggleChip(chip)}
                    >
                      {form.extraChips.includes(chip) && (
                        <svg class="tpb-chip-check" viewBox="0 0 12 10" width="10" height="8">
                          <path d="M1 5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      )}
                      {chip}
                    </button>
                  ))}
                </div>
              </Field>
            )}

          </div>

          {/* ── Preview ── */}
          <div class="tpb-preview-col">
            <div class="tpb-preview-header">
              <span class="tpb-preview-title">Черновик запроса</span>
              {preview && (
                <span class="tpb-preview-badge">Обновляется в реальном времени</span>
              )}
            </div>
            <textarea
              class="tpb-preview-area"
              value={preview}
              onInput={e => { setPreview(e.target.value); setEdited(true); }}
              placeholder="Запрос формируется автоматически по мере выбора параметров…"
              rows={8}
            />

            {/* Expert hints */}
            {expertHints.length > 0 && (
              <div class="tpb-expert-hints">
                <span class="tpb-expert-hints-icon" aria-hidden="true">💡</span>
                <div class="tpb-expert-hints-body">
                  {expertHints.map((h, i) => (
                    <p key={i} class="tpb-expert-hint">{h}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Live Strategy */}
            {strategy && (
              <div class="tpb-strategy">
                <div class="tpb-strategy-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="12" height="12">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  Стратегия поиска
                </div>
                <p class="tpb-strategy-text">{strategy}</p>
              </div>
            )}

            <div class="tpb-preview-hint">
              Текст можно отредактировать перед отправкой
            </div>

            <div class="tpb-preview-actions">
              <button
                class="tpb-polish-btn"
                type="button"
                onClick={handlePolish}
                disabled={polishing || !preview}
              >
                {polishing ? (
                  <>
                    <span class="tpb-polish-spinner" aria-hidden="true" />
                    Улучшаю…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                      <path d="M12 2l1.09 3.26L16.18 6l-2.45 2.44L14.36 12 12 10.28 9.64 12l.63-3.56L7.82 6l3.09-.74z"/>
                      <path d="M5 20l2-2m10 2l-2-2"/>
                    </svg>
                    AI Polish
                  </>
                )}
              </button>
              <button
                class="tpb-send-btn"
                type="button"
                onClick={handleSend}
                disabled={!preview}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Отправить в MIRA
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
