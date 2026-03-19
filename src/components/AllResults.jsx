import { useState } from 'preact/hooks';
import { fmt, stars, CURRENCY_SYM } from '../utils.js';
import { ToursPopup } from './HotelCard.jsx';
import './AllResults.css';

const HotelIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="8" width="20" height="14"/>
    <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
);

function ResultRow({ hotel, index, currency }) {
  const [open, setOpen] = useState(false);
  const sym = CURRENCY_SYM[currency] || currency;
  const altSym = currency === 'USD' ? CURRENCY_SYM.UZS : CURRENCY_SYM.USD;
  const price = currency === 'USD' ? hotel.min_price_usd : hotel.min_price_uzs;
  const altPrice = currency === 'USD' ? hotel.min_price_uzs : hotel.min_price_usd;

  return (
    <>
      <div
        class="rr"
        onClick={() => setOpen(true)}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }}}
        role="button"
        aria-label={`${hotel.name}, от ${fmt(price)} ${sym}`}
      >
        <span class="rr-num" aria-hidden="true">{index + 1}</span>
        <HotelThumb src={hotel.picture_url} alt={hotel.name} />
        <div class="rr-info">
          <div class="rr-name">{hotel.name}</div>
          <div class="rr-sub">
            <span class="rr-stars" aria-hidden="true">{stars(hotel.stars)}</span>
            {' '}
            <span class="rr-rating">{hotel.rating.toFixed(1)}</span>
            {' · '}
            {hotel.region}
          </div>
        </div>
        <div class="rr-price">
          {fmt(price)} {sym}
          <span class="rr-price-alt">{fmt(altPrice)} {altSym}</span>
        </div>
        <span class="rr-caret" aria-hidden="true">›</span>
      </div>

      {open && <ToursPopup hotel={hotel} currency={currency} onClose={() => setOpen(false)} />}
    </>
  );
}

function HotelThumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div class="rr-thumb-ph">
        <HotelIcon />
      </div>
    );
  }
  return (
    <img
      class="rr-thumb"
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function AllResults({ hotels, currency }) {
  const [open, setOpen] = useState(false);

  return (
    <div class="all-results">
      <button
        class={`all-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="all-results-list"
      >
        <span>Все результаты ({hotels.length})</span>
        <span class="all-toggle-arrow" aria-hidden="true">▼</span>
      </button>
      {open && (
        <div class="all-list" id="all-results-list" role="list">
          {hotels.map((h, i) => (
            <ResultRow key={h.hotel_id} hotel={h} index={i} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
