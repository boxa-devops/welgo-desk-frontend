export const CURRENCY_SYM = { UZS: 'сум', USD: '$' };

export const CHIPS = [
  'Турция, 2 недели, всё включено',
  'ОАЭ, 7 ночей, 4 звезды',
  'Таиланд, пляж',
  'Мальдивы, медовый месяц',
];

export function fmt(n) {
  return Math.round(n).toLocaleString('ru-RU');
}

/** Compact UZS: 15 820 261 → "15,8 млн", 850 000 → "850 тыс" */
export function fmtUzs(n, lang = 'ru') {
  if (n == null) return '—';
  const mln = lang === 'uz' ? ' mln' : ' млн';
  const tys = lang === 'uz' ? ' ming' : ' тыс';
  if (n >= 1_000_000) {
    const m = Math.round(n / 100_000) / 10;
    return m.toLocaleString('ru-RU') + mln;
  }
  return Math.round(n / 1000).toLocaleString('ru-RU') + tys;
}

export function stars(n) {
  return '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, 5 - n));
}

export function ratingClass(r) {
  if (r >= 8) return 'high';
  if (r >= 6) return 'mid';
  return 'low';
}

/** Pick the three highlight hotels from a sorted list. */
export function pickHighlights(hotels) {
  if (!hotels.length) return { bestValue: null, cheapest: null, topRated: null };

  const byValue = [...hotels].sort((a, b) => b.value_score - a.value_score);
  const bestValue = byValue[0];

  const byCheap = [...hotels].sort((a, b) => a.min_price_uzs - b.min_price_uzs);
  const cheapest = byCheap.find(h => h.hotel_id !== bestValue.hotel_id) || byCheap[0];

  const byRating = [...hotels].sort((a, b) => b.rating - a.rating);
  const used = new Set([bestValue.hotel_id, cheapest.hotel_id]);
  const topRated = byRating.find(h => !used.has(h.hotel_id)) || byRating[0];

  return { bestValue, cheapest, topRated };
}
