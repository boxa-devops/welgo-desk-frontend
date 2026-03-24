import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import DeskHotelCard from './DeskHotelCard.jsx';
import DeskAnalysisPanel from './DeskAnalysisPanel.jsx';
import DeskQuoteBox from './DeskQuoteBox.jsx';
import DeskAllHotelsModal from './DeskAllHotelsModal.jsx';
import TourPromptBuilder from './TourPromptBuilder.jsx';
import { apiFetch } from '../../lib/api.js';
import './DeskView.css';

// ── Desk-specific search chips ──
const DESK_CHIPS = [
  'Турция, UAI, 7 ночей, бюджет до $1000',
  'ОАЭ, 5★, 7 ночей из Ташкента',
  'Таиланд, 2 взрослых + 1 ребёнок, пляж',
  'Мальдивы, медовый месяц, люкс',
];

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);

// ── Empty filter state ──
const EMPTY_FILTER = { priceMin: null, priceMax: null, starsMin: null, mealPlan: null };

// ── Clarify bubble ──
const CLARIFY_LABELS = { countries: 'Страна', nights: 'Ночи', guests: 'Туристы' };

function ClarifyBubble({ message, onSearch }) {
  const { clarify } = message;
  const [selections, setSelections] = useState({});

  if (!clarify) return null;

  const toggle = (key, chip) => {
    setSelections(prev => ({ ...prev, [key]: prev[key] === chip ? null : chip }));
  };

  // Enabled when every critical missing param has a selection
  const countryMissing = clarify.missing?.includes('country');
  const canSearch = !countryMissing || !!selections['countries'];

  const handleSearch = () => {
    if (!canSearch) return;
    const chips = Object.values(selections).filter(Boolean);
    const combined = message.userText
      ? `${message.userText} ${chips.join(' ')}`
      : chips.join(' ');
    onSearch(combined);
  };

  return (
    <div class="desk-ai-plain">
      <div class="desk-avatar" aria-label="Welgo Desk AI">D</div>
      <div class="desk-clarify-bubble">
        <p class="desk-clarify-question">{clarify.question}</p>
        {Object.entries(clarify.suggestions).map(([key, chips]) => (
          <div key={key} class="desk-clarify-group">
            <span class="desk-clarify-group-label">{CLARIFY_LABELS[key] ?? key}</span>
            <div class="desk-clarify-chips">
              {chips.map(chip => (
                <button
                  key={chip}
                  class={`desk-clarify-chip${selections[key] === chip ? ' selected' : ''}`}
                  onClick={() => toggle(key, chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button class="desk-clarify-search-btn" onClick={handleSearch} disabled={!canSearch}>
          Начать поиск →
        </button>
        <p class="desk-clarify-hint">Или введите уточнение в поле ниже</p>
      </div>
    </div>
  );
}

// ── Plain-text AI bubble ──
function PlainBubble({ text }) {
  return (
    <div class="desk-ai-plain">
      <div class="desk-avatar" aria-label="Welgo Desk AI">D</div>
      <div class="desk-plain-bubble">{text}</div>
    </div>
  );
}

// ── Thinking skeleton ──
function ThinkingBubble({ statusText, progress, hotelsFound, hotelNames }) {
  return (
    <div class="desk-ai-plain">
      <div class="desk-avatar">D</div>
      <div class="desk-thinking">
        <div class="desk-thinking-row">
          <div class="desk-thinking-dots" aria-label="Анализирую…">
            <span /><span /><span />
          </div>
          <span class="desk-thinking-label">
            {statusText || 'Анализирую предложения…'}
          </span>
        </div>
        {hotelNames && hotelNames.length > 0 && (
          <div class="desk-thinking-names">
            {hotelNames.map(name => (
              <span key={name} class="desk-thinking-name-chip">{name}</span>
            ))}
          </div>
        )}
        {progress > 0 && progress < 100 && (
          <div class="desk-progress-wrap">
            <div class="desk-progress-bar">
              <div class="desk-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            {hotelsFound > 0 && (
              <span class="desk-progress-count">{hotelsFound} отелей</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gather client info form (shown while search runs) ──
function GatherClientBubble({ data, progress, onSubmit, onSkip }) {
  const [values, setValues] = useState({});

  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    const result = {};
    (data.fields || []).forEach(f => {
      if (values[f.key]?.trim()) result[f.key] = values[f.key].trim();
    });
    onSubmit(result);
  };

  return (
    <div class="desk-ai-plain">
      <div class="desk-avatar">D</div>
      <div class="desk-gather-client">
        <div class="desk-gather-header">
          <span class="desk-gather-title">{data.title || 'Данные клиента'}</span>
          <span class="desk-gather-desc">{data.description || 'Заполните пока идёт поиск'}</span>
        </div>

        {/* Mini progress bar while search runs */}
        <div class="desk-gather-progress">
          <div class="desk-gather-progress-fill" style={{ width: progress > 0 ? `${progress}%` : '5%', transition: 'width 0.4s ease' }} />
        </div>

        <div class="desk-gather-fields">
          {(data.fields || []).map(field => (
            <div class="desk-gather-field" key={field.key}>
              <label class="desk-gather-label">{field.label}</label>
              <input
                class="desk-gather-input"
                type={field.key === 'phone' ? 'tel' : 'text'}
                placeholder={field.placeholder || ''}
                value={values[field.key] || ''}
                onInput={e => set(field.key, e.target.value)}
                autocomplete="off"
              />
            </div>
          ))}
        </div>

        <div class="desk-gather-actions">
          <button class="desk-gather-submit" onClick={handleSubmit}>
            Сохранить →
          </button>
          {data.skippable && (
            <button class="desk-gather-skip" onClick={onSkip}>
              {data.skip_label || 'Пропустить'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Streaming analysis bubble ──
// Renders plain text during streaming to avoid table/markdown glitches.
// Full markdown render happens after the result event (StructuredResult).
function StreamingAnalysis({ text }) {
  return (
    <div class="desk-ai-plain">
      <div class="desk-avatar">D</div>
      <div class="desk-streaming-bubble">
        <pre class="desk-streaming-text">{text}<span class="desk-streaming-cursor" aria-hidden="true" /></pre>
      </div>
    </div>
  );
}

// ── Tier selector config ──
const TIER_META = {
  value:  { label: 'Ценность', emoji: '⭐' },
  budget: { label: 'Цена',     emoji: '💰' },
  luxury: { label: 'Рейтинг',  emoji: '🏆' },
  beach:  { label: 'Море',     emoji: '🏖️' },
  risky:  { label: 'Риск',     emoji: '⚠️' },
};

// Canonical display order for tier pills
const TIER_ORDER = ['value', 'budget', 'luxury', 'beach', 'risky'];

// Client-side sort comparators per tier (applied to the full hotel list)
const valueScore = h =>
  h.rating * 15 + h.stars * 2
  - Math.log(Math.max(h.price_uzs, 1) / 10_000) * 10
  + (h.sea_distance_m != null && h.sea_distance_m < 200 ? 5 : 0);

const TIER_SORT = {
  value:  (a, b) => valueScore(b) - valueScore(a),
  budget: (a, b) => a.price_uzs - b.price_uzs,
  luxury: (a, b) => b.rating - a.rating,
  beach:  (a, b) => {
    if (a.sea_distance_m == null && b.sea_distance_m == null) return 0;
    if (a.sea_distance_m == null) return 1;
    if (b.sea_distance_m == null) return -1;
    return a.sea_distance_m - b.sea_distance_m;
  },
  risky:  (a, b) => a.rating - b.rating, // worst first
};

const TOP_N = 4; // how many hotels to show per tier view

// ── Build a Telegram-style quote from manually selected hotels ──
function buildQuote(hotels) {
  if (!hotels.length) return '';
  const lines = ['✈️ Подобрали для вас несколько вариантов:\n'];
  for (const h of hotels) {
    lines.push(`🏨 *${h.hotel_name}* (${h.stars}★, рейтинг ${h.rating.toFixed(1)})`);
    lines.push(`📍 ${h.region}`);
    lines.push(`🍽 Питание: ${h.meal_plan}`);
    if (h.sea_distance_m != null) lines.push(`🌊 До моря: ${h.sea_distance_m} м`);
    lines.push(`💰 от $${h.price_usd_approx.toLocaleString('en-US')} за двоих (${h.nights} ноч., ${h.departure_date})`);
    lines.push('');
  }
  lines.push('Свяжитесь с нами для уточнения деталей и бронирования!');
  return lines.join('\n');
}

// ── Structured response block ──
function StructuredResult({ message, sessionId, onHide, onShowAll }) {
  const [activeTier, setActiveTier] = useState(null);
  const [poolHotels, setPoolHotels] = useState(null);   // full cached list, loaded on demand
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [customQuote, setCustomQuote] = useState(null);

  const { structured } = message;
  if (!structured) return null;

  const parallelTop = structured.ui_hotels; // 2-4 parallel winners from backend
  const total = structured.meta?.total_options_found ?? 0;

  // Tiers present in the parallel top, in canonical order
  const presentTiers = TIER_ORDER.filter(t => parallelTop.some(h => h.value_tier === t));

  // Select tier: fetch all cached hotels on first selection, sort by criterion, take top N
  const handleTierClick = async (tier) => {
    const next = activeTier === tier ? null : tier;
    setActiveTier(next);

    if (next && !poolHotels) {
      setPoolLoading(true);
      try {
        const r = await apiFetch(`/api/desk/hotels?session_id=${encodeURIComponent(sessionId)}`);
        if (r.ok) {
          const data = await r.json();
          setPoolHotels(data.hotels ?? []);
        }
      } finally {
        setPoolLoading(false);
      }
    }
  };

  // Toggle hotel selection for client quote
  const handleSelect = (hotelId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(hotelId)) next.delete(hotelId);
      else next.add(hotelId);
      return next;
    });
    setCustomQuote(null); // reset until user generates
  };

  // Generate custom quote from selected hotels
  const handleGenerateQuote = () => {
    const pool = poolHotels ?? parallelTop;
    const selected = visibleHotels.filter(h => selectedIds.has(h.hotel_id));
    // also search pool for any not in visible list
    const allSelected = [...new Map(
      [...selected, ...(pool ?? []).filter(h => selectedIds.has(h.hotel_id))]
        .map(h => [h.hotel_id, h])
    ).values()];
    setCustomQuote(buildQuote(allSelected));
  };

  // Compute visible hotels
  let visibleHotels;
  if (!activeTier) {
    visibleHotels = parallelTop; // default: parallel winners
  } else if (poolLoading || !poolHotels) {
    visibleHotels = parallelTop.filter(h => h.value_tier === activeTier); // fallback while loading
  } else {
    const sorter = TIER_SORT[activeTier] ?? TIER_SORT.value;
    visibleHotels = [...poolHotels].sort(sorter).slice(0, TOP_N);
  }

  const selCount = selectedIds.size;

  return (
    <div class="desk-result-block">
      <DeskAnalysisPanel
        text={structured.ai_analysis}
        fromCache={structured.meta?.from_cache}
        totalFound={total}
      />

      {/* Tier selector — only show when there are 2+ distinct tiers */}
      {presentTiers.length > 1 && (
        <div class="desk-tier-selector" role="group" aria-label="Фильтр по критерию">
          <button
            class={`desk-tier-pill${activeTier === null ? ' desk-tier-pill--active' : ''}`}
            onClick={() => setActiveTier(null)}
          >
            Топ
          </button>
          {presentTiers.map(tier => {
            const meta = TIER_META[tier];
            const isActive = activeTier === tier;
            return (
              <button
                key={tier}
                class={`desk-tier-pill desk-tier-pill--${tier}${isActive ? ' desk-tier-pill--active' : ''}`}
                onClick={() => handleTierClick(tier)}
                title={`Топ-${TOP_N} по критерию «${meta.label}»`}
              >
                <span aria-hidden="true">{meta.emoji}</span>
                {meta.label}
                {isActive && poolLoading && <span class="desk-tier-pill-spin" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {visibleHotels.length === 0 ? (
        <p class="desk-no-results">Нет вариантов по выбранному критерию.</p>
      ) : (
        <div class="desk-hotel-grid">
          {visibleHotels.map(h => (
            <DeskHotelCard
              key={h.hotel_id}
              hotel={h}
              onHide={name => onHide(name)}
              selected={selectedIds.has(h.hotel_id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Selection action bar */}
      {selCount > 0 && (
        <div class="desk-select-bar">
          <span class="desk-select-bar-count">
            {selCount} {selCount === 1 ? 'отель' : selCount < 5 ? 'отеля' : 'отелей'} выбрано
          </span>
          <button class="desk-select-bar-btn" onClick={handleGenerateQuote}>
            Сформировать сообщение →
          </button>
          <button
            class="desk-select-bar-clear"
            onClick={() => { setSelectedIds(new Set()); setCustomQuote(null); }}
            title="Снять выбор"
          >
            ✕
          </button>
        </div>
      )}

      {total > parallelTop.length && (
        <button class="desk-show-all-btn" onClick={onShowAll} aria-label={`Открыть все ${total} вариантов`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Все варианты
          <span class="desk-show-all-btn-count">{total}</span>
        </button>
      )}

      <DeskQuoteBox text={customQuote ?? structured.client_quote} />
    </div>
  );
}

// ── Main DeskView ──
export default function DeskView({ sessionId, onTurnComplete }) {
  const [messages, setMessages] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [text, setText] = useState('');
  const [allHotelsOpen, setAllHotelsOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  // Client info gathered via the gather_client form — persisted for the session
  const [clientInfo, setClientInfo] = useState(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  // Always-current snapshot of messages (avoids stale closure in callbacks)
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Load existing conversation history on mount
  useEffect(() => {
    apiFetch(`/api/desk/conversations/${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.messages?.length) return;
        setMessages(data.messages.map(m => {
          if (m.role === 'user') {
            return { id: m.id, type: 'user', text: m.content };
          }
          const isSearch = m.meta?.type === 'search';
          return {
            id: m.id,
            type: 'desk-ai',
            state: 'done',
            plain_text: isSearch ? null : m.content,
            structured: isSearch ? {
              ai_analysis: m.content,
              ui_hotels: m.meta.ui_hotels ?? [],
              client_quote: m.meta.client_quote ?? '',
              meta: m.meta.meta ?? {},
              available_filters: m.meta.available_filters ?? null,
            } : null,
            streamingAnalysis: '',
            filterState: EMPTY_FILTER,
            filterLoading: false,
            error: null,
          };
        }));
      })
      .catch(() => {});
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }, [text]);

  const updateMessage = useCallback((id, patch) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }, []);

  // ── Send a chat message ──
  const handleSend = useCallback(async (rawText, contextActions = []) => {
    if (isThinking || !rawText.trim()) return;
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userId = Date.now();
    const aiId = userId + 1;

    // Don't add a user bubble for silent exclusion requests
    const isExclusion = contextActions.length > 0;

    setMessages(prev => [
      ...prev.filter(m => m.type !== 'welcome'),
      ...(isExclusion ? [] : [{ id: userId, type: 'user', text: rawText }]),
      { id: aiId, type: 'desk-ai', state: 'thinking', userText: rawText, statusText: '', progress: 0, hotelsFound: 0, hotelNames: [],
        streamingAnalysis: '', structured: null, plain_text: null, clarify: null, filteredHotels: null, filterState: EMPTY_FILTER, filterLoading: false, error: null },
    ]);

    setIsThinking(true);

    try {
      // Build conversation history so the backend understands short refinements
      // like "в апреле" in the context of the previous search query.
      const history = messagesRef.current
        .filter(m => m.type === 'user' && m.text)
        .map(m => m.text);

      const resp = await apiFetch('/api/desk/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: rawText,
          session_id: sessionId,
          history,
          blacklist,
          context_actions: contextActions,
          ...(clientInfo ? { client_info: clientInfo } : {}),
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let msg = errText;
        try { msg = JSON.parse(errText).detail ?? errText; } catch {}
        updateMessage(aiId, { state: 'error', error: msg });
        return;
      }

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let chunk;
          try { chunk = JSON.parse(raw); } catch { continue; }

          if (chunk.type === 'error') {
            updateMessage(aiId, { state: 'error', error: chunk.text });
            return;
          }
          if (chunk.type === 'done') return;
          if (chunk.type === 'status') {
            updateMessage(aiId, { state: 'thinking', statusText: chunk.text });
          }
          if (chunk.type === 'progress') {
            updateMessage(aiId, {
              state: 'thinking',
              statusText: chunk.text,
              progress: chunk.progress ?? 0,
              hotelsFound: chunk.hotels_found ?? 0,
              hotelNames: chunk.hotel_names ?? [],
            });
          }
          if (chunk.type === 'analysis_stream') {
            setMessages(prev => prev.map(m => m.id === aiId
              ? { ...m, state: 'analyzing', streamingAnalysis: (m.streamingAnalysis || '') + chunk.text }
              : m
            ));
          }
          if (chunk.type === 'result') {
            updateMessage(aiId, { state: 'done', structured: chunk.structured });
          }
          if (chunk.type === 'gather_client') {
            updateMessage(aiId, { gatherClient: chunk });
          }
          if (chunk.type === 'clarify') {
            updateMessage(aiId, { state: 'clarify', clarify: chunk });
          }
          if (chunk.type === 'plain') {
            updateMessage(aiId, { state: 'done', plain_text: chunk.text });
          }
        }
      }
    } catch (e) {
      updateMessage(aiId, { state: 'error', error: e.message });
    } finally {
      setIsThinking(false);
      onTurnComplete?.();
    }
  }, [isThinking, sessionId, blacklist, clientInfo, updateMessage, onTurnComplete]);

  // ── Hotel hide ──
  const handleHide = useCallback((hotelName) => {
    const newBlacklist = [...new Set([...blacklist, hotelName])];
    setBlacklist(newBlacklist);
    handleSend(
      `Скрыть: ${hotelName}`,
      [{ action: 'exclude_hotel', hotel_name: hotelName, reason: 'excluded by agent' }],
    );
  }, [blacklist, handleSend]);

  // ── Instant filter via /api/desk/filter ──
  const handleFilterChange = useCallback(async (msgId, filterVal, commit) => {
    // Always update filter state immediately for responsive UI
    updateMessage(msgId, { filterState: filterVal });

    if (!commit) return; // debounced — only call API when committed

    updateMessage(msgId, { filterLoading: true });
    try {
      const resp = await apiFetch('/api/desk/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          price_min: filterVal.priceMin ?? null,
          price_max: filterVal.priceMax ?? null,
          stars_min: filterVal.starsMin ?? null,
          meal_plan: filterVal.mealPlan ?? null,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        updateMessage(msgId, { filteredHotels: data.ui_hotels, filterLoading: false });
      } else {
        updateMessage(msgId, { filterLoading: false });
      }
    } catch {
      updateMessage(msgId, { filterLoading: false });
    }
  }, [sessionId, updateMessage]);

  // ── All-hotels modal: summarize selected ──
  const handleSummarize = useCallback(async (hotelIds, mode) => {
    const aiId = Date.now();
    setMessages(prev => [
      ...prev,
      { id: aiId, type: 'desk-ai', state: 'thinking', statusText: '', progress: 0, hotelsFound: 0, hotelNames: [],
        streamingAnalysis: '', structured: null, plain_text: null, filteredHotels: null, filterState: EMPTY_FILTER, filterLoading: false, error: null },
    ]);
    setIsThinking(true);
    try {
      const resp = await apiFetch('/api/desk/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, hotel_ids: hotelIds, mode }),
      });
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let chunk; try { chunk = JSON.parse(line.slice(6)); } catch { continue; }
          if (chunk.type === 'done') return;
          if (chunk.type === 'error') { updateMessage(aiId, { state: 'error', error: chunk.text }); return; }
          if (chunk.type === 'status') updateMessage(aiId, { state: 'thinking', statusText: chunk.text });
          if (chunk.type === 'analysis_stream') {
            setMessages(prev => prev.map(m => m.id === aiId
              ? { ...m, state: 'analyzing', streamingAnalysis: (m.streamingAnalysis || '') + chunk.text }
              : m));
          }
          if (chunk.type === 'result') updateMessage(aiId, { state: 'done', structured: chunk.structured });
        }
      }
    } catch (e) {
      updateMessage(aiId, { state: 'error', error: e.message });
    } finally {
      setIsThinking(false);
    }
  }, [sessionId, updateMessage]);

  // ── Find similar: pre-fill the input with hotel context ──
  const handleSimilar = useCallback((hotel) => {
    const msg = `Найди похожие на ${hotel.hotel_name}: ${hotel.region}, ${hotel.stars}★, питание ${hotel.meal_plan}`;
    handleSend(msg);
  }, [handleSend]);

  const submit = useCallback(() => {
    if (isThinking || !text.trim()) return;
    handleSend(text.trim());
  }, [isThinking, text, handleSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }, [submit]);

  const showWelcome = messages.length === 0;

  return (
    <div class="desk-shell">
      {allHotelsOpen && (() => {
        const last = [...messages].reverse().find(m => m.structured);
        return (
          <DeskAllHotelsModal
            sessionId={sessionId}
            totalFound={last?.structured?.meta?.total_options_found ?? 0}
            filters={last?.structured?.available_filters ?? null}
            filterState={last?.filterState ?? EMPTY_FILTER}
            filterLoading={last?.filterLoading ?? false}
            filteredHotels={last?.filteredHotels ?? null}
            onFilterChange={(val, commit) => last && handleFilterChange(last.id, val, commit)}
            onClose={() => setAllHotelsOpen(false)}
            onSummarize={handleSummarize}
            onSimilar={handleSimilar}
          />
        );
      })()}
      {/* ── Messages area ── */}
      <div class="desk-scroll" ref={scrollRef} role="log" aria-live="polite">
        {showWelcome && (
          <div class="desk-welcome">
            <div class="desk-welcome-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <h2 class="desk-welcome-title">Welgo Desk</h2>
            <p class="desk-welcome-sub">Аналитический ассистент для туристических агентов</p>
            <div class="desk-chips">
              {DESK_CHIPS.map(chip => (
                <button
                  key={chip}
                  class="desk-chip"
                  onClick={() => handleSend(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          // Show separator only when the previous AI response was a complete structured result
          // (i.e. a full search iteration finished), not after clarify/error/plain responses.
          const prevAi = messages.slice(0, idx).reverse().find(p => p.type === 'desk-ai');
          const showSep = m.type === 'user' && idx > 0 && prevAi?.structured;

          if (m.type === 'user') {
            return [
              showSep && (
                <div key={`sep-${m.id}`} class="desk-iter-sep">
                  <span class="desk-iter-sep-line" />
                  <span class="desk-iter-sep-label">Новый запрос</span>
                  <span class="desk-iter-sep-line" />
                </div>
              ),
              <div key={m.id} class="desk-user-row">
                <div class="desk-user-bubble">{m.text}</div>
              </div>,
            ];
          }

          if (m.state === 'thinking') {
            if (m.gatherClient) {
              return (
                <GatherClientBubble
                  key={m.id}
                  data={m.gatherClient}
                  progress={m.progress}
                  onSubmit={info => { setClientInfo(info); updateMessage(m.id, { gatherClient: null }); }}
                  onSkip={() => updateMessage(m.id, { gatherClient: null })}
                />
              );
            }
            return <ThinkingBubble key={m.id} statusText={m.statusText} progress={m.progress} hotelsFound={m.hotelsFound} hotelNames={m.hotelNames} />;
          }
          if (m.state === 'analyzing') return <StreamingAnalysis key={m.id} text={m.streamingAnalysis} />;
          if (m.state === 'clarify') return <ClarifyBubble key={m.id} message={m} onSearch={handleSend} />;
          if (m.state === 'error') {
            return (
              <div key={m.id} class="desk-error" role="alert">
                Ошибка: {m.error}
              </div>
            );
          }
          if (m.plain_text) return <PlainBubble key={m.id} text={m.plain_text} />;
          if (m.structured) {
            return (
              <div key={m.id} class="desk-result-wrap">
                <div class="desk-avatar" aria-label="Welgo Desk AI">D</div>
                <StructuredResult
                  message={m}
                  sessionId={sessionId}
                  onHide={handleHide}
                  onShowAll={() => setAllHotelsOpen(true)}
                />
              </div>
            );
          }
          return null;
        })}
      </div>

      {builderOpen && (
        <TourPromptBuilder
          onSend={(prompt) => { setText(prompt); setTimeout(() => textareaRef.current?.focus(), 50); }}
          onClose={() => setBuilderOpen(false)}
        />
      )}

      {/* ── Input bar ── */}
      <div class="desk-input-bar">
        <div class="desk-input-wrap">
          <button
            class="desk-builder-btn"
            type="button"
            onClick={() => setBuilderOpen(true)}
            title="Конструктор запроса"
            aria-label="Открыть конструктор запроса"
            disabled={isThinking}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            class="desk-textarea"
            rows={1}
            placeholder="Запрос агента: направление, даты, бюджет, пожелания…"
            value={text}
            onInput={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            aria-label="Запрос агента"
            autocomplete="off"
          />
          <button
            class="desk-send-btn"
            onClick={submit}
            disabled={isThinking || !text.trim()}
            title="Отправить (Enter)"
            aria-label="Отправить"
          >
            {isThinking
              ? <span class="desk-send-spinner" aria-hidden="true" />
              : <SendIcon />
            }
          </button>
        </div>
        {blacklist.length > 0 && (
          <div class="desk-blacklist-bar">
            <span class="desk-blacklist-label">Скрыты:</span>
            {blacklist.map(name => (
              <span key={name} class="desk-blacklist-tag">
                {name}
                <button
                  class="desk-blacklist-remove"
                  onClick={() => setBlacklist(prev => prev.filter(n => n !== name))}
                  aria-label={`Вернуть ${name}`}
                  title="Вернуть в результаты"
                >×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
