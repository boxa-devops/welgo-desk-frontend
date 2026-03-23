import { useRef } from 'preact/hooks';
import { fmtUzs } from '../../utils.js';
import './DeskFilterBar.css';

const DEBOUNCE_MS = 350;

export default function DeskFilterBar({ filters, value, onChange, loading }) {
  const timerRef = useRef(null);

  if (!filters) return null;

  const { min_price_uzs, max_price_uzs, meal_plans = [], stars_available = [] } = filters;
  const range = max_price_uzs - min_price_uzs || 1;

  const schedule = (patch) => {
    const next = { ...value, ...patch };
    onChange(next); // update local state immediately for UI responsiveness
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next, true), DEBOUNCE_MS);
    // second arg `true` signals parent to actually call /api/desk/filter
  };

  const priceMin = value.priceMin ?? min_price_uzs;
  const priceMax = value.priceMax ?? max_price_uzs;

  // % positions for the slider track fill
  const minPct = ((priceMin - min_price_uzs) / range) * 100;
  const maxPct = ((priceMax - min_price_uzs) / range) * 100;

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
            {/* Track fill */}
            <div
              class="dfb-track-fill"
              style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
            />
            {/* Min thumb */}
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
            {/* Max thumb */}
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
      </div>
    </div>
  );
}
