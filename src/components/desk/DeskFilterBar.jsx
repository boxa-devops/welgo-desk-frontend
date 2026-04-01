import { useState, useRef } from 'preact/hooks';
import { fmtUzs } from '../../utils.js';
import './DeskFilterBar.css';

const DEBOUNCE_MS = 350;

export default function DeskFilterBar({ filters, value, onChange, loading }) {
  const timerRef = useRef(null);
  const [operatorSearch, setOperatorSearch] = useState('');

  if (!filters) return null;

  const { min_price_uzs, max_price_uzs, meal_plans = [], stars_available = [], operators = [] } = filters;
  const range = max_price_uzs - min_price_uzs || 1;

  const schedule = (patch) => {
    const next = { ...value, ...patch };
    onChange(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next, true), DEBOUNCE_MS);
  };

  const priceMin = value.priceMin ?? min_price_uzs;
  const priceMax = value.priceMax ?? max_price_uzs;
  const minPct = ((priceMin - min_price_uzs) / range) * 100;
  const maxPct = ((priceMax - min_price_uzs) / range) * 100;

  // Operator multi-select
  const selectedOps = value.operators ?? [];

  const toggleOperator = (op) => {
    const next = selectedOps.includes(op)
      ? selectedOps.filter(o => o !== op)
      : [...selectedOps, op];
    schedule({ operators: next });
  };

  const clearOperators = () => {
    schedule({ operators: [] });
    setOperatorSearch('');
  };

  const opQuery = operatorSearch.toLowerCase();
  const visibleOperators = opQuery
    ? operators.filter(op => op.toLowerCase().includes(opQuery))
    : operators;

  return (
    <div class="dfb-root">
      <div class="dfb-header">
        <span class="dfb-title">
          {loading && <span class="dfb-spinner" aria-hidden="true" />}
          Фильтры
        </span>
      </div>

      <div class="dfb-body">
        {/* ── Price slider ── */}
        <div class="dfb-group">
          <label class="dfb-label">
            Цена: <strong>{fmtUzs(priceMin)}</strong> — <strong>{fmtUzs(priceMax)}</strong> сум
          </label>
          <div class="dfb-slider-wrap">
            <div
              class="dfb-track-fill"
              style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
            />
            <input
              type="range"
              class="dfb-range dfb-range--min"
              min={min_price_uzs}
              max={max_price_uzs}
              step={Math.round(range / 100)}
              value={priceMin}
              onInput={e => {
                const v = Math.min(Number(e.target.value), priceMax - 1);
                schedule({ priceMin: v });
              }}
              aria-label="Минимальная цена"
            />
            <input
              type="range"
              class="dfb-range dfb-range--max"
              min={min_price_uzs}
              max={max_price_uzs}
              step={Math.round(range / 100)}
              value={priceMax}
              onInput={e => {
                const v = Math.max(Number(e.target.value), priceMin + 1);
                schedule({ priceMax: v });
              }}
              aria-label="Максимальная цена"
            />
          </div>
        </div>

        {/* ── Stars filter ── */}
        {stars_available.length > 1 && (
          <div class="dfb-group">
            <label class="dfb-label">Звёздность</label>
            <div class="dfb-pills" role="group" aria-label="Звёздность">
              <button
                class={`dfb-pill ${!value.starsMin ? 'dfb-pill--active' : ''}`}
                onClick={() => schedule({ starsMin: null })}
              >
                Все
              </button>
              {stars_available.sort().map(s => (
                <button
                  key={s}
                  class={`dfb-pill ${value.starsMin === s ? 'dfb-pill--active' : ''}`}
                  onClick={() => schedule({ starsMin: s })}
                  aria-pressed={value.starsMin === s}
                >
                  {'★'.repeat(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Meal plan filter ── */}
        {meal_plans.length > 1 && (
          <div class="dfb-group">
            <label class="dfb-label">Питание</label>
            <div class="dfb-pills" role="group" aria-label="Тип питания">
              <button
                class={`dfb-pill ${!value.mealPlan ? 'dfb-pill--active' : ''}`}
                onClick={() => schedule({ mealPlan: null })}
              >
                Все
              </button>
              {meal_plans.map(m => (
                <button
                  key={m}
                  class={`dfb-pill ${value.mealPlan === m ? 'dfb-pill--active' : ''}`}
                  onClick={() => schedule({ mealPlan: m === value.mealPlan ? null : m })}
                  aria-pressed={value.mealPlan === m}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Operators filter (multi-select + search) ── */}
        {operators.length > 1 && (
          <div class="dfb-group">
            <div class="dfb-label-row">
              <label class="dfb-label">Операторы</label>
              {selectedOps.length > 0 && (
                <button class="dfb-ops-clear" onClick={clearOperators}>
                  Сбросить ({selectedOps.length})
                </button>
              )}
            </div>

            {operators.length > 5 && (
              <input
                class="dfb-ops-search"
                type="search"
                placeholder="Найти оператора…"
                value={operatorSearch}
                onInput={e => setOperatorSearch(e.target.value)}
              />
            )}

            <div class="dfb-ops-list" role="group" aria-label="Туроператоры">
              {visibleOperators.map(op => {
                const isSelected = selectedOps.includes(op);
                return (
                  <button
                    key={op}
                    class={`dfb-pill dfb-pill--op${isSelected ? ' dfb-pill--active' : ''}`}
                    onClick={() => toggleOperator(op)}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <svg class="dfb-pill-check" viewBox="0 0 12 10" width="10" height="8">
                        <path d="M1 5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    )}
                    {op}
                  </button>
                );
              })}
              {opQuery && visibleOperators.length === 0 && (
                <span class="dfb-ops-empty">Не найдено</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
