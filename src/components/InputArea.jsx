import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import OperatorsPopover from './OperatorsPopover.jsx';
import './InputArea.css';

const CURRENCIES = ['UZS', 'USD'];

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);

const FiltersIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="18" x2="20" y2="18"/>
    <circle cx="8"  cy="6"  r="2" fill="white"/>
    <circle cx="16" cy="12" r="2" fill="white"/>
    <circle cx="10" cy="18" r="2" fill="white"/>
  </svg>
);

const PlaneTakeoffIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-1 0-1.5.5-3.5 2.5L8 8 6.2 2.2l-1.7 1.7 2.1 3.6L4 9l-1.5-.5-.8.8 2.7 1.9 1.9 2.7.8-.8-.5-1.5 1.5-2.6 3.6 2.1z"/>
  </svg>
);

export default function InputArea({
  catalog,
  currency, onCurrencyChange,
  departure, onDepartureChange,
  checkedOpIds, onCheckedOpIdsChange,
  liveOpCounts,
  advParams, onAdvParamsChange,
  isSearching,
  onSend,
}) {
  const [text, setText] = useState('');
  const [advOpen, setAdvOpen] = useState(false);
  const textareaRef = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [text]);

  const submit = useCallback(() => {
    if (isSearching || !text.trim()) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [isSearching, text, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }, [submit]);

  const advField = (key) => ({
    value: advParams[key] ?? '',
    onInput: (e) => onAdvParamsChange(p => ({ ...p, [key]: e.target.value })),
    class: 'adv-input',
  });

  const departureLabel = departure
    ? catalog.departures.find(d => String(d.id) === departure)?.name ?? 'Вылет'
    : 'Вылет';

  const allIds = catalog.operators.map(o => o.id);
  const checkedCount = checkedOpIds === null ? allIds.length : checkedOpIds.length;
  const opLabel = checkedCount === allIds.length ? 'Все операторы' : `${checkedCount} операторов`;

  return (
    <div class="input-bar" role="region" aria-label="Строка ввода">
      <div class="input-wrap">

        {/* ── Main: textarea + send ── */}
        <div class="input-main">
          <textarea
            ref={textareaRef}
            class="chat-input"
            rows={1}
            placeholder="Куда хотите поехать? Например: Турция, 2 недели, всё включено"
            value={text}
            onInput={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            autocomplete="off"
            disabled={isSearching}
            aria-label="Введите запрос"
          />
          <button
            class="send-btn"
            onClick={submit}
            disabled={isSearching || !text.trim()}
            title="Отправить (Enter)"
            aria-label="Отправить запрос"
          >
            {isSearching
              ? <span class="send-spinner" aria-hidden="true" />
              : <SendIcon />
            }
          </button>
        </div>

        {/* ── Controls strip ── */}
        <div class="controls-strip">

          {/* Departure */}
          <div class="ctrl-select-wrap">
            <PlaneTakeoffIcon />
            <select
              class="ctrl-select"
              value={departure}
              onChange={e => onDepartureChange(e.target.value)}
              aria-label="Город вылета"
            >
              <option value="">Город вылета</option>
              {catalog.departures.map(d => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </div>

          <div class="ctrl-divider" aria-hidden="true" />

          {/* Currency */}
          <div class="pill-group" role="group" aria-label="Валюта">
            {CURRENCIES.map(cur => (
              <button
                key={cur}
                class={`pill-btn ${currency === cur ? 'active' : ''}`}
                onClick={() => onCurrencyChange(cur)}
                aria-pressed={currency === cur}
              >
                {cur}
              </button>
            ))}
          </div>

          <div class="ctrl-divider" aria-hidden="true" />

          {/* Operators */}
          <OperatorsPopover
            operators={catalog.operators}
            checkedOpIds={checkedOpIds}
            onCheckedOpIdsChange={onCheckedOpIdsChange}
            liveOpCounts={liveOpCounts}
          />

          {/* Spacer */}
          <div class="ctrl-spacer" />

          {/* Advanced params toggle */}
          <button
            class={`adv-toggle ${advOpen ? 'open' : ''}`}
            onClick={() => setAdvOpen(o => !o)}
            title="Дополнительные параметры"
            aria-label="Дополнительные параметры поиска"
            aria-expanded={advOpen}
          >
            <FiltersIcon />
            <span>Параметры{advOpen ? ' ▲' : ' ▼'}</span>
          </button>
        </div>

        {/* ── Advanced params panel ── */}
        {advOpen && (
          <div class="adv-panel" role="group" aria-label="Дополнительные параметры">

            <div class="adv-row">
              <div class="adv-field">
                <label class="adv-label" for="adv-date-from">Дата вылета</label>
                <input type="date" id="adv-date-from" {...advField('dateFrom')} />
              </div>
              <div class="adv-field">
                <label class="adv-label" for="adv-date-to">Дата до</label>
                <input type="date" id="adv-date-to" {...advField('dateTo')} />
              </div>
              <div class="adv-field">
                <label class="adv-label" id="nights-label">Ночей</label>
                <div class="adv-range">
                  <input type="number" min="1" max="30" placeholder="7"
                    aria-labelledby="nights-label" aria-label="от"
                    {...advField('nightsFrom')} />
                  <span class="adv-sep">—</span>
                  <input type="number" min="1" max="30" placeholder="14"
                    aria-label="до" {...advField('nightsTo')} />
                </div>
              </div>
            </div>

            <div class="adv-row">
              <div class="adv-field">
                <label class="adv-label" for="adv-adults">Взрослых</label>
                <input type="number" id="adv-adults" min="1" max="6" {...advField('adults')} />
              </div>
              <div class="adv-field">
                <label class="adv-label" for="adv-stars">Звёздность</label>
                <select
                  id="adv-stars"
                  class="adv-input adv-select"
                  value={advParams.stars ?? ''}
                  onChange={e => onAdvParamsChange(p => ({ ...p, stars: e.target.value }))}
                >
                  <option value="">Любая</option>
                  <option value="3">3 ★</option>
                  <option value="4">4 ★</option>
                  <option value="5">5 ★</option>
                </select>
              </div>
              <div class="adv-field">
                <label class="adv-label" for="adv-price-to">Бюджет до</label>
                <input type="number" id="adv-price-to"
                  step="100000" placeholder="5 000 000"
                  style="width:120px"
                  {...advField('priceTo')} />
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
