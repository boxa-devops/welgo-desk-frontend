import { useState, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { fmt, stars, ratingClass, CURRENCY_SYM } from '../utils.js';
import './TourDetailModal.css';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" width="16" height="16">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

function FlightCard({ flight, label }) {
  if (!flight) return null;
  const dep      = flight.departTime   || flight.depart_time   || '';
  const arr      = flight.arriveTime   || flight.arrive_time   || '';
  const shift    = flight.arriveDayShift || flight.arrive_day_shift || 0;
  const from     = flight.fromCity     || flight.from_city     || flight.from || '';
  const to       = flight.toCity       || flight.to_city       || flight.to   || '';
  const airline  = flight.airline      || flight.airlineName   || flight.airline_name || '';
  const duration = flight.flightTime   || flight.flight_time   || flight.duration || '';
  const charter  = flight.isCharter    || flight.is_charter    || false;
  const date     = flight.date         || flight.departDate    || flight.depart_date || '';
  const flightNo = flight.flightNumber || flight.flight_number || '';

  return (
    <div class="tdm-flight">
      <div class="tdm-flight-label">{label}</div>
      <div class="tdm-flight-row">
        <div class="tdm-flight-time">
          {dep}{arr && <> — {arr}{shift > 0 && <sup>+{shift}</sup>}</>}
        </div>
        <div class="tdm-flight-route">{from} — {to}</div>
        <div class="tdm-flight-tags">
          {duration  && <span class="tdm-ftag">{duration}</span>}
          {airline   && <span class="tdm-ftag">{airline}</span>}
          {flightNo  && <span class="tdm-ftag">{flightNo}</span>}
          {charter   && <span class="tdm-ftag tdm-ftag--charter">Чартер</span>}
        </div>
        {date && <div class="tdm-flight-date">{date}</div>}
      </div>
    </div>
  );
}

function extractFlights(flights) {
  if (!flights) return { outbound: null, inbound: null };
  if (Array.isArray(flights)) return { outbound: flights[0] || null, inbound: flights[1] || null };
  return {
    outbound: flights.departure?.[0] || flights.outbound || flights.out || null,
    inbound:  flights.arrival?.[0]   || flights.inbound  || flights.back || null,
  };
}


function MapEmbed({ lat, lon, name }) {
  const delta = 0.018;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  const gmapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
  const osmUrl   = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;

  return (
    <div class="tdm-map-wrap">
      <div class="tdm-map-frame">
        <iframe
          class="tdm-map"
          src={osmEmbed}
          title={`Карта: ${name}`}
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <a
          class="tdm-map-overlay"
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Открыть в Google Maps"
        >
          <span class="tdm-map-overlay-hint">
            <MapPinIcon /> Открыть в Google Maps
          </span>
        </a>
      </div>
      <div class="tdm-map-links">
        <MapPinIcon />
        <span class="tdm-coords">{lat.toFixed(5)}, {lon.toFixed(5)}</span>
        <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" class="tdm-map-link">Google Maps</a>
        <a href={osmUrl}   target="_blank" rel="noopener noreferrer" class="tdm-map-link">OpenStreetMap</a>
      </div>
    </div>
  );
}

export default function TourDetailModal({ tour, hotel, currency, onClose }) {
  const [tourDetails, setTourDetails] = useState(null);   // null=loading, false=error

  const sym    = CURRENCY_SYM[currency] || currency;
  const altSym = currency === 'USD' ? CURRENCY_SYM.UZS : CURRENCY_SYM.USD;
  const price    = currency === 'USD' ? tour.price_usd : tour.price_uzs;
  const altPrice = currency === 'USD' ? tour.price_uzs : tour.price_usd;
  const rc = ratingClass(hotel.rating);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);

    fetch(`/api/tours/${tour.tour_id}/details`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setTourDetails)
      .catch(() => setTourDetails(false));

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [tour.tour_id, hotel.hotel_id, onClose]);

  const { outbound, inbound } = extractFlights(tourDetails?.flights);

  const lat = hotel.latitude;
  const lon = hotel.longitude;
  const hasMap = lat != null && lon != null;

  const tourRows = [
    { label: 'Страна',         value: hotel.country },
    { label: 'Направление',    value: hotel.region },
    { label: 'Город вылета',   value: tour.departure_city || null },
    { label: 'Дата вылета',    value: tour.date },
    { label: 'Ночей',          value: tour.nights != null ? String(tour.nights) : null },
    { label: 'Взрослых',       value: tour.adults != null ? String(tour.adults) : null },
    { label: 'Детей',          value: tour.childs > 0 ? String(tour.childs) : null },
    { label: 'Питание',        value: tour.meal },
    { label: 'Тип номера',     value: tour.room_type || null },
    { label: 'Размещение',     value: tour.placement || null },
    { label: 'Тип рейса',      value: tour.is_charter ? 'Чартер' : 'Регулярный', charter: tour.is_charter },
    { label: 'Акция',          value: tour.is_promo ? '⚡ Промо-цена' : null, promo: true },
    { label: 'Топливный сбор', value: tour.fuel_charge > 0 ? `${fmt(tour.fuel_charge)} UZS` : null },
    { label: 'Услуги',         value: tourDetails?.services || null },
  ].filter(r => r.value != null && r.value !== '');

  const hotelRows = [
    { label: 'Рейтинг', value: hotel.rating.toFixed(1) },
    { label: 'До моря', value: hotel.sea_distance != null ? `${hotel.sea_distance} м` : null },
  ].filter(r => r.value != null && r.value !== '');

  async function handleBuy() {
    if (tourDetails?.operator_link) {
      window.open(tourDetails.operator_link, '_blank', 'noopener,noreferrer');
    }
  }

  return createPortal(
    <div class="tdm-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${hotel.name} — тур`}>
      <div class="tdm" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div class="tdm-header">
          {hotel.picture_url
            ? <img class="tdm-hotel-photo" src={hotel.picture_url} alt={hotel.name} />
            : <div class="tdm-hotel-photo-ph" />
          }
          <div class="tdm-header-info">
            <div class="tdm-hotel-name">{hotel.name}</div>
            <div class="tdm-hotel-meta">
              <span class="tdm-stars">{stars(hotel.stars)}</span>
              <span class={`tdm-rating ${rc}`}>{hotel.rating.toFixed(1)}</span>
              <span class="tdm-region">{hotel.region}, {hotel.country}</span>
            </div>
            <div class="tdm-operator">{tour.operator_name}</div>
          </div>
          <button class="tdm-close" onClick={onClose} aria-label="Закрыть"><CloseIcon /></button>
        </div>

        <div class="tdm-body">

          {/* Price + buy */}
          <div class="tdm-price-row">
            <div>
              <div class="tdm-price">{fmt(price)} <span class="tdm-price-sym">{sym}</span></div>
              <div class="tdm-price-alt">{fmt(altPrice)} {altSym}</div>
            </div>
            <button
              class="tdm-buy-btn"
              onClick={handleBuy}
              disabled={!tourDetails || !tourDetails.operator_link}
              title={!tourDetails ? 'Загрузка…' : !tourDetails.operator_link ? 'Ссылка недоступна' : ''}
            >
              {!tourDetails ? 'Загрузка…' : 'Заявка на тур'}
            </button>
          </div>

          {/* Tour info */}
          <div class="tdm-section-title">Тур</div>
          <div class="tdm-info-grid">
            {tourRows.map(({ label, value, charter, promo }) => (
              <div key={label} class="tdm-info-row">
                <span class="tdm-info-label">{label}</span>
                <span class={`tdm-info-value${charter ? ' tdm-badge--charter' : ''}${promo ? ' tdm-badge--promo' : ''}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Flights */}
          {(outbound || inbound) && (
            <>
              <div class="tdm-section-title">Перелёты</div>
              <div class="tdm-flights">
                <FlightCard flight={outbound} label="Туда" />
                <FlightCard flight={inbound}  label="Обратно" />
              </div>
            </>
          )}

          {/* Hotel info */}
          {hotelRows.length > 0 && (
            <>
              <div class="tdm-section-title">Отель</div>
              <div class="tdm-info-grid">
                {hotelRows.map(({ label, value }) => (
                  <div key={label} class="tdm-info-row">
                    <span class="tdm-info-label">{label}</span>
                    <span class="tdm-info-value">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Map */}
          {hasMap && (
            <>
              <div class="tdm-section-title">На карте</div>
              <MapEmbed lat={lat} lon={lon} name={hotel.name} />
            </>
          )}

          {tourDetails === false && <div class="tdm-details-err">Не удалось загрузить детали тура</div>}

        </div>
      </div>
    </div>,
    document.body
  );
}
