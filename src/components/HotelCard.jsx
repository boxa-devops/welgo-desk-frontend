import { useState } from 'preact/hooks';
import { fmt, stars, ratingClass, CURRENCY_SYM } from '../utils.js';
import './HotelCard.css';

const FlightIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-1 0-1.5.5-3.5 2.5L8 8 6.2 2.2l-1.7 1.7 2.1 3.6L4 9l-1.5-.5-.8.8 2.7 1.9 1.9 2.7.8-.8-.5-1.5 1.5-2.6 3.6 2.1z"/>
  </svg>
);

// Inline SVG icons — no emoji
const ICONS = {
  trophy: <svg viewBox="0 0 24 24"><path d="M6 9H2V3h4M18 9h4V3h-4M12 17v4M8 21h8M6 3h12l-1 9a5 5 0 0 1-10 0L6 3z"/></svg>,
  tag:    <svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/></svg>,
  star:   <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  hotel:  <svg viewBox="0 0 24 24"><rect x="2" y="8" width="20" height="14"/><path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
};

function LabelIcon({ name }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return <span class="hcard-label-icon" aria-hidden="true">{icon}</span>;
}

/** Group tours by operator, sorted cheapest-first within each group. */
function groupByOperator(tours) {
  const map = new Map();
  for (const t of tours) {
    if (!map.has(t.operator_name)) map.set(t.operator_name, []);
    map.get(t.operator_name).push(t);
  }
  // Sort operators by their cheapest tour price
  return [...map.entries()]
    .sort((a, b) => Math.min(...a[1].map(t => t.price)) - Math.min(...b[1].map(t => t.price)));
}

export default function HotelCard({ hotel, label, labelIcon, currency }) {
  const [expanded, setExpanded] = useState(false);
  const sym = CURRENCY_SYM[hotel.currency] || hotel.currency;
  const rc = ratingClass(hotel.rating);
  const opGroups = expanded ? groupByOperator(hotel.tours) : null;
  const opCount = new Set(hotel.tours.map(t => t.operator_name)).size;

  return (
    <article
      class={`hcard ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(e => !e)}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v); }}}
      aria-expanded={expanded}
      aria-label={`${hotel.name}, ${stars(hotel.stars)}, от ${fmt(hotel.min_price)} ${sym}`}
    >
      <div class="hcard-photo-wrap">
        <HotelPhoto src={hotel.picture_url} />
        <div class="hcard-label">
          <LabelIcon name={labelIcon} />
          {label}
        </div>
      </div>

      <div class="hcard-body">
        <div class="hcard-name">{hotel.name}</div>
        <div class="hcard-meta">
          <span class="hcard-stars" aria-label={`${hotel.stars} звёзд`}>{stars(hotel.stars)}</span>
          <span class={`hcard-rating ${rc}`} aria-label={`Рейтинг ${hotel.rating.toFixed(1)}`}>
            {hotel.rating.toFixed(1)}
          </span>
          <span class="hcard-region">{hotel.region}</span>
        </div>
        <div class="hcard-price" aria-label={`от ${fmt(hotel.min_price)} ${sym}`}>
          {fmt(hotel.min_price)}
          <span class="hcard-price-sym">{sym}</span>
        </div>
        <div class="hcard-hint">
          {opCount} {plural(opCount, 'оператор', 'оператора', 'операторов')} · {hotel.tours.length} туров
          <span class="hcard-hint-caret" aria-hidden="true">{expanded ? ' ▲' : ' ▼'}</span>
        </div>
      </div>

      {expanded && (
        <div class="hcard-tours" onClick={e => e.stopPropagation()}>
          {opGroups.map(([opName, tours]) => {
            const tsym = CURRENCY_SYM[tours[0].currency] || tours[0].currency;
            return (
              <div key={opName} class="hcard-op-group">
                <div class="hcard-op-name">{opName}</div>
                {tours.map((t, i) => (
                  <div key={i} class="hcard-tour-row">
                    <span class="hcard-tour-info">
                      {t.date} · {t.nights}н · {t.meal_short}
                      {t.is_charter ? ' · чартер' : ''}
                    </span>
                    <div class="hcard-tour-right">
                      <span class="hcard-tour-price">{fmt(t.price)} {tsym}</span>
                      <button
                        class="hcard-flights-btn"
                        title="Скоро: проверка рейсов"
                        aria-label="Проверить рейсы (скоро)"
                        disabled
                        onClick={e => e.stopPropagation()}
                      >
                        <FlightIcon />
                        Рейсы
                        <span class="hcard-flights-soon">скоро</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function HotelPhoto({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div class="hcard-photo-ph" aria-hidden="true">
        {ICONS.hotel}
      </div>
    );
  }
  return (
    <img
      class="hcard-photo"
      src={src}
      loading="lazy"
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
