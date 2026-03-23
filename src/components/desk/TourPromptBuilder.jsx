import { useState, useCallback } from 'preact/hooks';
import './TourPromptBuilder.css';

// ─────────────────────────────────────────────────────────────────────────────
// Config
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

// ─────────────────────────────────────────────────────────────────────────────
// Core: prompt generator
// ─────────────────────────────────────────────────────────────────────────────

export function generatePrompt(form) {
  const dest = form.destination === 'custom'
    ? (form.customDestination?.trim() || 'неизвестное направление')
    : (DESTINATIONS.find(d => d.value === form.destination)?.label ?? form.destination);
  const month     = form.month ? `в ${MONTHS[form.month - 1]}` : '';
  const duration  = form.duration ? `на ${form.duration} ночей` : '';
  const adults    = form.adults ?? 2;
  const children  = form.children ?? 0;
  const people    = children > 0
    ? `${adults} взр. + ${children} реб.`
    : `${adults} взр.`;
  const budget    = BUDGETS.find(b => b.value === form.budget)?.label ?? '';
  const vibeList  = (form.vibes ?? [])
    .map(v => VIBES.find(x => x.value === v)?.label ?? v)
    .join(', ');

  const departure = form.departureCity ? `из ${form.departureCity}` : '';

  const parts = [
    `Ты — экспертный турагент Welgo.`,
    `Составь подборку туров в ${dest}${month ? ' ' + month : ''}${duration ? ' ' + duration : ''}`,
    departure ? `${departure}` : '',
    `для ${people}.`,
    vibeList  ? `Тип отдыха: ${vibeList}.` : '',
    budget    ? `Бюджет: ${budget}.` : '',
    `Сделай акцент на качестве сервиса, реальных отзывах и локальных особенностях курорта.`,
    `Предложи 3–5 вариантов с кратким описанием каждого отеля.`,
  ].filter(Boolean).join(' ');

  return parts;
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
};

export default function TourPromptBuilder({ onSend, onClose }) {
  const [form, setForm]       = useState(DEFAULT_FORM);
  const [preview, setPreview] = useState('');
  const [generated, setGenerated] = useState(false);

  const set = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setGenerated(false);
  }, []);

  const toggleVibe = useCallback((v) => {
    setForm(prev => {
      const vibes = prev.vibes.includes(v)
        ? prev.vibes.filter(x => x !== v)
        : [...prev.vibes, v];
      return { ...prev, vibes };
    });
    setGenerated(false);
  }, []);

  const handleGenerate = () => {
    const text = generatePrompt(form);
    setPreview(text);
    setGenerated(true);
  };

  const handleSend = () => {
    const text = preview || generatePrompt(form);
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

          </div>

          {/* ── Preview ── */}
          <div class="tpb-preview-col">
            <div class="tpb-preview-header">
              <span class="tpb-preview-title">Предпросмотр запроса</span>
              {generated && (
                <span class="tpb-preview-badge">Готово к отправке</span>
              )}
            </div>
            <textarea
              class="tpb-preview-area"
              value={preview}
              onInput={e => setPreview(e.target.value)}
              placeholder="Нажмите «Сгенерировать» — здесь появится текст запроса для MIRA. Вы сможете отредактировать его перед отправкой."
              rows={10}
            />
            <div class="tpb-preview-hint">
              Текст можно отредактировать перед отправкой
            </div>

            <div class="tpb-preview-actions">
              <button
                class="tpb-generate-btn"
                type="button"
                onClick={handleGenerate}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
                Сгенерировать
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
