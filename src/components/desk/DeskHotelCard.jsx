import { useState } from "preact/hooks";
import { fmtUzs, stars, ratingClass } from "../../utils.js";
import { apiFetch } from "../../lib/api.js";
import { usePostHog } from "../../lib/posthog.jsx";
import "./DeskHotelCard.css";

const TIER_LABELS = {
  value: "Ценность",
  budget: "Цена",
  luxury: "Рейтинг",
  beach: "Море",
  risky: "Риск",
};

const HideIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    width="13"
    height="13"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const SeaIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    width="12"
    height="12"
  >
    <path d="M2 12s3-4 10-4 10 4 10 4-3 4-10 4-10-4-10-4z" />
    <path d="M2 18c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
  </svg>
);

function OperatorBadge({ id, name, tourId }) {
  const posthog = usePostHog();
  const [loading, setLoading] = useState(false);

  const logoUrl = id
    ? `https://tourvisor.ru/pics/operators/mobilelogo/${id}.png`
    : null;

  const handleOpen = async (e) => {
    e.stopPropagation();
    posthog.capture("operator_link_clicked", { operator_name: name });
    setLoading(true);
    try {
      const r = await apiFetch(
        `/api/desk/tour-link?tour_id=${encodeURIComponent(tourId)}`
      );
      const data = await r.json();
      if (data.operator_link) {
        window.open(data.operator_link, "_blank", "noopener,noreferrer");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="dhcard-operator-badge">
      {logoUrl && (
        <img
          class="dhcard-op-logo"
          src={logoUrl}
          alt={name}
          title={name}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}
      <span class="dhcard-operator">{name}</span>
      <button
        class="dhcard-op-link-btn"
        onClick={handleOpen}
        disabled={loading}
        title="Перейти на сайт оператора"
      >
        {loading ? (
          "…"
        ) : (
          <svg
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            width="12"
            height="12"
          >
            <path d="M5.5 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8.5" />
            <path d="M8 1h5m0 0v5m0-5L6 8" />
          </svg>
        )}
      </button>
    </div>
  );
}

function HotelPhoto({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div class="dhcard-photo-ph" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect x="2" y="8" width="20" height="14" />
          <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
        </svg>
      </div>
    );
  }
  return (
    <img
      class="dhcard-photo"
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const SelectIcon = ({ selected }) =>
  selected ? (
    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        fill="none"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      width="13"
      height="13"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function fmtPillDate(dateStr) {
  const parts = dateStr.split("-");
  const day = parseInt(parts[2], 10);
  const mo = parseInt(parts[1], 10) - 1;
  return `${day} ${MONTHS_SHORT[mo]}`;
}

export default function DeskHotelCard({ hotel, onHide, selected, onSelect, annotation }) {
  const posthog = usePostHog();
  const rc = ratingClass(hotel.rating);
  const tier = hotel.value_tier;
  const dates = hotel.tour_dates || [];

  // Find which pill index matches the default departure_date
  const defaultIdx = dates.findIndex((d) => d.date === hotel.departure_date);
  const [activeDateIdx, setActiveDateIdx] = useState(
    defaultIdx >= 0 ? defaultIdx : 0
  );

  // Derive display data: use selected pill if available, else original hotel fields
  const activePill = dates.length > 0 ? dates[activeDateIdx] : null;
  const displayPriceUzs = activePill ? activePill.price_uzs : hotel.price_uzs;
  const displayPriceUsd = activePill
    ? activePill.price_usd_approx
    : hotel.price_usd_approx;
  const displayNights = activePill ? activePill.nights : hotel.nights;
  const displayDate = activePill ? activePill.date : hotel.departure_date;
  const displayCharter = activePill ? activePill.is_charter : hotel.is_charter;
  const displayTourId = activePill ? activePill.tour_id : hotel.tour_id;

  const handleHide = (e) => {
    e.stopPropagation();
    onHide?.(hotel.hotel_name);
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    onSelect?.(hotel.hotel_id);
  };

  return (
    <article
      class={`dhcard dhcard--${tier}${selected ? " dhcard--selected" : ""}`}
    >
      {/* Photo + badges */}
      <div class="dhcard-photo-wrap">
        <HotelPhoto src={hotel.image_url} name={hotel.hotel_name} />
        <div class={`dhcard-tier dhcard-tier--${tier}`}>
          {TIER_LABELS[tier]}
        </div>
        <button
          class="dhcard-hide-btn"
          onClick={handleHide}
          title="Скрыть этот отель"
          aria-label={`Скрыть ${hotel.hotel_name}`}
        >
          <HideIcon />
          Скрыть
        </button>
      </div>

      {/* Body */}
      <div class="dhcard-body">
        <div class="dhcard-name-row">
          <div class="dhcard-name">{hotel.hotel_name}</div>
          {annotation?.is_recommended && (
            <span class="dhcard-rec-badge" title="Рекомендация AI">
              <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
              </svg>
              Рекомендован
            </span>
          )}
        </div>

        <div class="dhcard-meta">
          <span class="dhcard-stars" aria-label={`${hotel.stars} звёзд`}>
            {stars(hotel.stars)}
          </span>
          <span class={`dhcard-rating ${rc}`}>{hotel.rating.toFixed(1)}</span>
          <span class="dhcard-region">{hotel.region}</span>
        </div>

        {/* Professional insight — green */}
        {annotation?.insight && (
          <div class="dhcard-insight">
            <span class="dhcard-insight-icon" aria-hidden="true">✓</span>
            <span class="dhcard-insight-text">{annotation.insight}</span>
          </div>
        )}

        {/* Red flag — red */}
        {annotation?.red_flag && (
          <div class="dhcard-flag">
            <span class="dhcard-flag-icon" aria-hidden="true">!</span>
            <span class="dhcard-flag-text">{annotation.red_flag}</span>
          </div>
        )}

        {/* Features chips */}
        {hotel.features?.length > 0 && (
          <div class="dhcard-features">
            {hotel.features.map((f) => (
              <span key={f} class="dhcard-chip">
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Date picker pills */}
        {dates.length > 1 && (
          <div class="dhcard-dates">
            {dates.map((d, i) => (
              <button
                key={d.date}
                class={`dhcard-date-pill${
                  i === activeDateIdx ? " dhcard-date-pill--active" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  posthog.capture("date_pill_changed", {
                    hotel_name: hotel.hotel_name,
                  });
                  setActiveDateIdx(i);
                }}
                title={`${fmtPillDate(
                  d.date
                )} — $${d.price_usd_approx.toLocaleString("en-US")}`}
              >
                <span class="dhcard-date-pill-day">{fmtPillDate(d.date)}</span>
                <span class="dhcard-date-pill-price">
                  ${d.price_usd_approx.toLocaleString("en-US")}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Price row — USD primary, UZS secondary */}
        <div class="dhcard-price-row">
          <div>
            <div class="dhcard-price">
              $<span>{displayPriceUsd.toLocaleString("en-US")}</span>
            </div>
            <div class="dhcard-price-uzs">{fmtUzs(displayPriceUzs)} сум</div>
          </div>
        </div>

        {/* Details */}
        <div class="dhcard-details">
          <span class="dhcard-detail-item">{hotel.meal_plan}</span>
          <span class="dhcard-detail-sep">·</span>
          <span class="dhcard-detail-item">{displayNights} ночей</span>
          <span class="dhcard-detail-sep">·</span>
          <span class="dhcard-detail-item">{displayDate}</span>
          {displayCharter && (
            <>
              <span class="dhcard-detail-sep">·</span>
              <span class="dhcard-detail-item dhcard-detail-charter">
                Чартер
              </span>
            </>
          )}
        </div>

        {/* Sea + operator row */}
        <div class="dhcard-footer">
          {hotel.sea_distance_m != null && (
            <span class="dhcard-sea">
              <SeaIcon />
              {hotel.sea_distance_m} м
            </span>
          )}
          <OperatorBadge
            id={hotel.operator_id}
            name={hotel.operator}
            tourId={displayTourId}
          />
        </div>

        {/* Select for client quote */}
        <button
          class={`dhcard-select-btn${selected ? " dhcard-select-btn--on" : ""}`}
          onClick={handleSelect}
          title={
            selected ? "Убрать из сообщения" : "Добавить в сообщение клиенту"
          }
          aria-pressed={selected}
        >
          <SelectIcon selected={selected} />
          {selected ? "В сообщении" : "В сообщение"}
        </button>
      </div>
    </article>
  );
}
