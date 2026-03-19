import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { fmt, stars, ratingClass, CURRENCY_SYM } from '../utils.js';
import TourDetailModal from './TourDetailModal.jsx';
import './HotelCard.css';

const FlightIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-1 0-1.5.5-3.5 2.5L8 8 6.2 2.2l-1.7 1.7 2.1 3.6L4 9l-1.5-.5-.8.8 2.7 1.9 1.9 2.7.8-.8-.5-1.5 1.5-2.6 3.6 2.1z"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" width="16" height="16">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

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
  return [...map.entries()]
    .sort((a, b) => Math.min(...a[1].map(t => t.price_usd)) - Math.min(...b[1].map(t => t.price_usd)));
}

function OperatorLogo({ id, name }) {
  const [failed, setFailed] = useState(false);
  const initials = name ? name.slice(0, 2).toUpperCase() : '?';

  if (!id || failed) {
    return (
      <div class="hpopup-op-logo hpopup-op-logo-ph" aria-hidden="true">
        {initials}
      </div>
    );
  }
  return (
    <img
      class="hpopup-op-logo"
      src={`https://tourvisor.ru/pics/operators/mobilelogo/${id}.png`}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}

function BuyButton({ tourId }) {
  const [state, setState] = useState('idle'); // idle | loading | error

  async function handleClick(e) {
    e.stopPropagation();
    setState('loading');
    try {
      const res = await fetch(`/api/tours/${tourId}/link`);
      if (!res.ok) throw new Error('not found');
      const { url } = await res.json();
      window.open(url, '_blank', 'noopener,noreferrer');
      setState('idle');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  return (
    <button
      class={`hpopup-book-btn ${state === 'loading' ? 'loading' : ''} ${state === 'error' ? 'error' : ''}`}
      onClick={handleClick}
      disabled={state === 'loading'}
    >
      {state === 'loading' ? '…' : state === 'error' ? 'Ошибка' : 'Купить'}
    </button>
  );
}

export function ToursPopup({ hotel, currency, onClose }) {
  const [selectedTour, setSelectedTour] = useState(null);
  const sym = CURRENCY_SYM[currency] || currency;
  const altSym = currency === 'USD' ? CURRENCY_SYM.UZS : CURRENCY_SYM.USD;
  const minPrice = currency === 'USD' ? hotel.min_price_usd : hotel.min_price_uzs;
  const rc = ratingClass(hotel.rating);
  const opGroups = groupByOperator(hotel.tours);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return [createPortal(
    <div class="hpopup-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={hotel.name}>
      <div class="hpopup" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div class="hpopup-header">
          <HotelThumbSmall src={hotel.picture_url} />
          <div class="hpopup-header-info">
            <div class="hpopup-name">{hotel.name}</div>
            <div class="hpopup-meta">
              <span class="hpopup-stars">{stars(hotel.stars)}</span>
              <span class={`hpopup-rating ${rc}`}>{hotel.rating.toFixed(1)}</span>
              <span class="hpopup-region">{hotel.region}</span>
            </div>
            <div class="hpopup-minprice">
              от <strong>{fmt(minPrice)}</strong> {sym}
            </div>
          </div>
          <button class="hpopup-close" onClick={onClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>

        {/* Operator groups */}
        <div class="hpopup-body">
          {opGroups.map(([opName, tours]) => {
            const opId = tours[0].operator_id;
            const opMinPrice = currency === 'USD'
              ? Math.min(...tours.map(t => t.price_usd))
              : Math.min(...tours.map(t => t.price_uzs));

            return (
              <div key={opName} class="hpopup-op-group">
                <div class="hpopup-op-header">
                  <OperatorLogo id={opId} name={opName} />
                  <span class="hpopup-op-name">{opName}</span>
                  <span class="hpopup-op-minprice">от {fmt(opMinPrice)} {sym}</span>
                </div>

                <div class="hpopup-tour-list">
                  {tours.map((t, i) => {
                    const tPrice = currency === 'USD' ? t.price_usd : t.price_uzs;
                    const tAlt   = currency === 'USD' ? t.price_uzs : t.price_usd;
                    return (
                      <div
                        key={i}
                        class="hpopup-tour-row hpopup-tour-row--clickable"
                        onClick={() => setSelectedTour(t)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedTour(t); }}
                      >
                        <div class="hpopup-tour-info">
                          <span class="hpopup-tour-date">{t.date}</span>
                          <span class="hpopup-tour-tags">
                            <span class="hpopup-tag">{t.nights}н</span>
                            <span class="hpopup-tag">{t.meal_short}</span>
                            {t.is_charter && <span class="hpopup-tag hpopup-tag-charter">чартер</span>}
                          </span>
                        </div>
                        <div class="hpopup-tour-right">
                          <div class="hpopup-tour-price">
                            {fmt(tPrice)} {sym}
                            <span class="hpopup-tour-price-alt">{fmt(tAlt)} {altSym}</span>
                          </div>
                          <span class="hpopup-detail-hint">›</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  ),
  selectedTour && createPortal(
    <TourDetailModal
      tour={selectedTour}
      hotel={hotel}
      currency={currency}
      onClose={() => setSelectedTour(null)}
    />,
    document.body
  ),
  ];
}

function HotelThumbSmall({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div class="hpopup-thumb-ph" aria-hidden="true">
        {ICONS.hotel}
      </div>
    );
  }
  return (
    <img
      class="hpopup-thumb"
      src={src}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

export default function HotelCard({ hotel, label, labelIcon, currency }) {
  const [open, setOpen] = useState(false);
  const sym = CURRENCY_SYM[currency] || currency;
  const altSym = currency === 'USD' ? CURRENCY_SYM.UZS : CURRENCY_SYM.USD;
  const minPrice = currency === 'USD' ? hotel.min_price_usd : hotel.min_price_uzs;
  const altPrice = currency === 'USD' ? hotel.min_price_uzs : hotel.min_price_usd;
  const rc = ratingClass(hotel.rating);
  const opCount = new Set(hotel.tours.map(t => t.operator_name)).size;

  return (
    <>
      <article
        class="hcard"
        onClick={() => setOpen(true)}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }}}
        aria-label={`${hotel.name}, ${stars(hotel.stars)}, от ${fmt(minPrice)} ${sym}`}
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
          <div class="hcard-price" aria-label={`от ${fmt(minPrice)} ${sym}`}>
            {fmt(minPrice)}
            <span class="hcard-price-sym">{sym}</span>
            <span class="hcard-price-alt">{fmt(altPrice)} {altSym}</span>
          </div>
          <div class="hcard-hint">
            {opCount} {plural(opCount, 'оператор', 'оператора', 'операторов')} · {hotel.tours.length} туров
            <span class="hcard-hint-caret" aria-hidden="true"> ›</span>
          </div>
        </div>
      </article>

      {open && <ToursPopup hotel={hotel} currency={currency} onClose={() => setOpen(false)} />}
    </>
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
