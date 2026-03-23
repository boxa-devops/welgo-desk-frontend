import { useState, useEffect, useMemo, useCallback, useRef } from 'preact/hooks';
import { fmtUzs } from '../../utils.js';
import { apiFetch } from '../../lib/api.js';
import DeskFilterBar from './DeskFilterBar.jsx';
import './DeskAllHotelsModal.css';

const PAGE_SIZE = 24;

// ── Compare drawer ──
function CompareDrawer({ hotels }) {
  if (hotels.length < 2) return null;

  const rows = [
    { label: 'Звёзды',   key: h => '★'.repeat(h.stars) },
    { label: 'Рейтинг',  key: h => h.rating?.toFixed(1) ?? '—', best: (a, b) => a.rating > b.rating },
    { label: 'Цена',     key: h => `$${h.price_usd_approx}`, best: (a, b) => a.price_uzs < b.price_uzs },
    { label: 'Питание',  key: h => h.meal_plan },
    { label: 'Море',     key: h => h.sea_distance_m != null ? `${h.sea_distance_m}м` : '—', best: (a, b) => (a.sea_distance_m ?? 9999) < (b.sea_distance_m ?? 9999) },
    { label: 'Ночей',    key: h => h.nights },
    { label: 'Регион',   key: h => h.region },
  ];

  return (
    <div class="dahm-compare">
      <div class="dahm-compare-title">Сравнение выбранных</div>
      <table class="dahm-compare-table">
        <thead>
          <tr>
            <th />
            {hotels.map(h => <th key={h.hotel_id}>{h.hotel_name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const vals = hotels.map(h => row.key(h));
            let bestIdx = -1;
            if (row.best && hotels.length >= 2) {
              bestIdx = 0;
              for (let i = 1; i < hotels.length; i++) {
                if (row.best(hotels[i], hotels[bestIdx])) bestIdx = i;
              }
            }
            return (
              <tr key={row.label}>
                <td style={{ color: 'var(--muted)', fontWeight: 500 }}>{row.label}</td>
                {vals.map((v, i) => (
                  <td key={i} class={bestIdx === i ? 'dahm-compare-best' : ''}>{v}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Single hotel card ──
function HotelCard({ hotel, selected, onToggle, onSimilar }) {
  return (
    <div class={`dahm-card ${selected ? 'selected' : ''}`} onClick={() => onToggle(hotel.hotel_id)}>
      <div class="dahm-card-check">
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4.5L4 7.5L10 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      {hotel.image_url
        ? <img class="dahm-card-img" src={hotel.image_url} alt={hotel.hotel_name} loading="lazy" />
        : <div class="dahm-card-img-placeholder">🏨</div>
      }

      <div class="dahm-card-body">
        <div class="dahm-card-name" title={hotel.hotel_name}>{hotel.hotel_name}</div>
        <div class="dahm-card-meta">
          {'★'.repeat(hotel.stars)} · {hotel.rating?.toFixed(1)} · {hotel.region}
        </div>
        <div>
          <span class="dahm-card-price">~${hotel.price_usd_approx?.toLocaleString('en-US')}</span>
          <span class="dahm-card-uzs">{fmtUzs(hotel.price_uzs)} сум</span>
        </div>
        <div class="dahm-card-meta" style={{ marginTop: 3 }}>{hotel.meal_plan} · {hotel.nights} ночей</div>
        <div class="dahm-card-actions">
          <button
            class="dahm-card-btn"
            onClick={e => { e.stopPropagation(); onSimilar(hotel); }}
          >
            Похожие
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main modal ──
export default function DeskAllHotelsModal({
  sessionId, totalFound, onClose, onSummarize, onSimilar,
  filters, filterState, filterLoading, filteredHotels, onFilterChange,
}) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [page, setPage] = useState(1);
  const gridKeyRef = useRef(0);

  // Load all hotels once
  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/desk/hotels?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(data => { setHotels(data.hotels || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  // When API filter results arrive, reset to first page
  useEffect(() => {
    setPage(1);
    gridKeyRef.current += 1;
  }, [filteredHotels]);

  // Filtered list — use API-filtered hotels when available, fallback to all
  const filtered = useMemo(() => {
    let list = filteredHotels ?? hotels;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(h => h.hotel_name.toLowerCase().includes(q) || h.region?.toLowerCase().includes(q));
    }
    return list;
  }, [filteredHotels, hotels, search]);

  // Reset page on local search change
  useEffect(() => {
    setPage(1);
    gridKeyRef.current += 1;
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectedHotels = useMemo(
    () => hotels.filter(h => selected.has(h.hotel_id)),
    [hotels, selected]
  );

  const handleSummarize = (mode) => {
    if (selected.size === 0) return;
    onSummarize([...selected], mode);
    onClose();
  };

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div class="dahm-overlay" onClick={handleOverlayClick}>
      <div class="dahm-panel">
        {/* Header */}
        <div class="dahm-header">
          <span class="dahm-title">
            Все варианты
            {!loading && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {filtered.length} из {(filteredHotels ?? hotels).length}</span>}
          </span>
          <button class="dahm-close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        {/* Dynamic filters */}
        {filters && (
          <DeskFilterBar
            filters={filters}
            value={filterState}
            onChange={onFilterChange}
            loading={filterLoading}
          />
        )}

        {/* Search toolbar */}
        <div class="dahm-toolbar">
          <input
            class="dahm-search"
            type="search"
            placeholder="Поиск по названию или региону…"
            value={search}
            onInput={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Compare drawer */}
        {showCompare && selected.size >= 2 && (
          <CompareDrawer hotels={selectedHotels} />
        )}

        {/* Grid */}
        <div class="dahm-grid-wrap">
          {loading ? (
            <div class="dahm-empty">Загружаем варианты…</div>
          ) : filtered.length === 0 ? (
            <div class="dahm-empty">Ничего не найдено. Попробуйте изменить фильтры.</div>
          ) : (
            <div class="dahm-grid" key={gridKeyRef.current}>
              {paged.map(hotel => (
                <HotelCard
                  key={hotel.hotel_id}
                  hotel={hotel}
                  selected={selected.has(hotel.hotel_id)}
                  onToggle={toggleSelect}
                  onSimilar={h => { onSimilar(h); onClose(); }}
                />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div class="dahm-pagination">
              <button
                class="dahm-page-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >←</button>
              <span class="dahm-page-label">{page} / {totalPages}</span>
              <button
                class="dahm-page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >→</button>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div class="dahm-bottom">
          {selected.size > 0 ? (
            <span class="dahm-selection-label">
              Выбрано: <strong>{selected.size}</strong>
            </span>
          ) : (
            <span class="dahm-selection-label">Отметьте отели для анализа</span>
          )}

          {selected.size >= 2 && (
            <button
              class="dahm-action-btn secondary"
              onClick={() => setShowCompare(v => !v)}
            >
              {showCompare ? 'Скрыть таблицу' : 'Сравнить'}
            </button>
          )}

          <button
            class="dahm-action-btn primary"
            disabled={selected.size === 0}
            onClick={() => handleSummarize('summarize')}
          >
            ОБОБЩИТЬ
          </button>

          {selected.size >= 2 && (
            <button
              class="dahm-action-btn secondary"
              onClick={() => handleSummarize('compare')}
            >
              СРАВНИТЬ АНАЛИЗ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
