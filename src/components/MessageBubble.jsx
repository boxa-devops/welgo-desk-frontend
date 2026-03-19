import HotelCard from './HotelCard.jsx';
import AllResults from './AllResults.jsx';
import { fmt, pickHighlights, CURRENCY_SYM } from '../utils.js';
import './MessageBubble.css';

function SkeletonCard() {
  return (
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-photo" />
      <div class="skeleton-body">
        <div class="skeleton-line w-85" />
        <div class="skeleton-line w-50" />
        <div class="skeleton-line w-40" />
        <div class="skeleton-line w-70" />
      </div>
    </div>
  );
}

function SearchingContent({ statusText, progress }) {
  return (
    <div class="searching-state" role="status" aria-label={statusText}>
      <div class="searching-header">
        <div class="searching-spinner" aria-hidden="true" />
        <span class="searching-status">{statusText}</span>
      </div>
      <div class="progress-track" aria-hidden="true">
        <div
          class={`progress-fill ${progress === 0 ? 'indeterminate' : ''}`}
          style={progress > 0 ? { width: `${progress}%` } : undefined}
        />
      </div>
      <div class="skeleton-cards" aria-hidden="true">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

function DoneContent({ hotels, fromCache, currency, hotelsExpired, expiredMessage }) {
  if (hotelsExpired) {
    return (
      <div class="ai-error" role="alert">
        <div class="ai-error-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <span>{expiredMessage}</span>
      </div>
    );
  }

  if (!hotels || hotels.length === 0) {
    return (
      <div class="ai-error" role="alert">
        <div class="ai-error-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <span>По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска.</span>
      </div>
    );
  }

  const { bestValue, cheapest, topRated } = pickHighlights(hotels);
  const sym = CURRENCY_SYM[currency] || currency;
  const altSym = currency === 'USD' ? CURRENCY_SYM.UZS : CURRENCY_SYM.USD;
  const priceKey = currency === 'USD' ? 'min_price_usd' : 'min_price_uzs';
  const altKey = currency === 'USD' ? 'min_price_uzs' : 'min_price_usd';
  const minP = Math.min(...hotels.map(h => h[priceKey]));
  const minPAlt = Math.min(...hotels.map(h => h[altKey]));
  const countryStr = hotels[0]?.country ? ` в ${hotels[0].country}` : '';

  return (
    <>
      <p class="ai-summary">
        Нашёл <strong>{hotels.length} {plural(hotels.length, 'отель', 'отеля', 'отелей')}</strong>{countryStr}.{' '}
        Минимальная цена — <strong>{fmt(minP)} {sym}</strong> <span class="ai-summary-alt">({fmt(minPAlt)} {altSym})</span>. Вот что рекомендую:
        {fromCache && <span class="cache-badge" title="Результат взят из кэша">из кэша</span>}
      </p>
      <div class="highlight-cards">
        {bestValue && <HotelCard hotel={bestValue} label="Лучший выбор" labelIcon="trophy" currency={currency} />}
        {cheapest  && <HotelCard hotel={cheapest}  label="Дешевле всего" labelIcon="tag"    currency={currency} />}
        {topRated  && <HotelCard hotel={topRated}  label="Высший рейтинг" labelIcon="star"  currency={currency} />}
      </div>
      {hotels.length > 3 && <AllResults hotels={hotels} currency={currency} />}
    </>
  );
}

function ErrorContent({ error }) {
  return (
    <div class="ai-error" role="alert">
      <div class="ai-error-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <span>Ошибка: {error}</span>
    </div>
  );
}

export default function MessageBubble({ message, currency }) {
  if (message.type === 'user') {
    return (
      <div class="msg-user">
        <div class="msg-user-bubble">{message.text}</div>
      </div>
    );
  }

  return (
    <div class="msg-ai">
      <div class="ai-avatar" aria-label="Welgosk AI">W</div>
      <div class="ai-bubble">
        {message.state === 'searching' && (
          <SearchingContent statusText={message.statusText} progress={message.progress} />
        )}
        {message.state === 'done' && (
          <DoneContent
            hotels={message.hotels}
            fromCache={message.fromCache}
            currency={currency}
            hotelsExpired={message.hotels_expired}
            expiredMessage={message.expired_message}
          />
        )}
        {message.state === 'text' && (
          <p class="ai-text-reply">{message.text}</p>
        )}
        {message.state === 'error' && (
          <ErrorContent error={message.error} />
        )}
      </div>
    </div>
  );
}

function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
