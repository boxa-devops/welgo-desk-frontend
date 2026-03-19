import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import TopBar from './components/TopBar.jsx';
import ChatArea from './components/ChatArea.jsx';
import InputArea from './components/InputArea.jsx';
import './App.css';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [catalog, setCatalog] = useState({ operators: [], departures: [], countries: [], meals: [] });
  const [currency, setCurrency] = useState('UZS');
  const [departure, setDeparture] = useState('');
  // null means "all operators"
  const [checkedOpIds, setCheckedOpIds] = useState(null);
  const [advParams, setAdvParams] = useState({
    dateFrom: '', dateTo: '', nightsFrom: '', nightsTo: '',
    adults: 2, stars: '', priceTo: '',
  });
  const [isSearching, setIsSearching] = useState(false);
  // map of op.id -> tour_count from live stream
  const [liveOpCounts, setLiveOpCounts] = useState({});

  const abortRef = useRef(null);

  useEffect(() => {
    fetch('/api/catalog')
      .then(r => r.json())
      .then(data => {
        setCatalog(data);
        // default to first Uzbek departure
        if (data.departures?.length) setDeparture(String(data.departures[0].id));
      })
      .catch(console.error);
  }, []);

  const updateAiMessage = useCallback((id, patch) => {
    setMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, ...patch } : m))
    );
  }, []);

  const handleSend = useCallback(async (text) => {
    if (isSearching || !text.trim()) return;

    // Remove welcome screen if present
    setMessages(prev => prev.filter(m => m.type !== 'welcome'));

    const userId = Date.now();
    const aiId = userId + 1;

    setMessages(prev => [
      ...prev,
      { id: userId, type: 'user', text },
      {
        id: aiId, type: 'ai', state: 'searching',
        progress: 0, statusText: 'Подключаемся к операторам…',
        fromCache: false, hotels: [], operatorsFound: [], error: null,
      },
    ]);

    setIsSearching(true);
    setLiveOpCounts({});

    const allIds = catalog.operators.map(o => o.id);
    const opIds = checkedOpIds === null ? null
      : checkedOpIds.length < allIds.length ? checkedOpIds : null;

    const body = {
      raw_message: text,
      departure: departure || null,
      currency,
      adults: Number(advParams.adults) || 2,
      date_from: advParams.dateFrom || null,
      date_to: advParams.dateTo || null,
      nights_from: advParams.nightsFrom ? Number(advParams.nightsFrom) : null,
      nights_to: advParams.nightsTo ? Number(advParams.nightsTo) : null,
      hotel_category: advParams.stars ? Number(advParams.stars) : null,
      price_to: advParams.priceTo ? Number(advParams.priceTo) : null,
      sort_by: 'value',
      operator_ids: opIds,
    };

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!resp.ok) {
        const msg = await resp.text();
        updateAiMessage(aiId, { state: 'error', error: msg });
        return;
      }

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let lastHotels = [];
      let lastFromCache = false;

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

          if (chunk.error) {
            updateAiMessage(aiId, { state: 'error', error: chunk.error });
            return;
          }

          if (chunk.done) {
            updateAiMessage(aiId, {
              state: 'done', hotels: lastHotels, fromCache: lastFromCache,
              progress: 100, operatorsFound: [],
            });
            setLiveOpCounts({});
            return;
          }

          lastHotels = chunk.hotels || [];
          lastFromCache = chunk.from_cache || false;

          updateAiMessage(aiId, {
            progress: chunk.progress || 0,
            statusText: chunk.status_text || 'Поиск…',
            hotels: lastHotels,
            fromCache: lastFromCache,
            operatorsFound: chunk.operators_found || [],
          });

          const counts = {};
          (chunk.operators_found || []).forEach(op => { counts[op.id] = op.tour_count; });
          setLiveOpCounts(counts);
        }
      }

      // stream ended without explicit done event
      updateAiMessage(aiId, { state: 'done', hotels: lastHotels, fromCache: lastFromCache, progress: 100 });
    } catch (e) {
      if (e.name !== 'AbortError') {
        updateAiMessage(aiId, { state: 'error', error: e.message });
      }
    } finally {
      setIsSearching(false);
      abortRef.current = null;
    }
  }, [isSearching, catalog.operators, checkedOpIds, departure, currency, advParams, updateAiMessage]);

  return (
    <div class="app-shell">
      <TopBar />
      <ChatArea
        messages={messages}
        currency={currency}
        onChipClick={handleSend}
        showWelcome={messages.length === 0}
      />
      <InputArea
        catalog={catalog}
        currency={currency}
        onCurrencyChange={setCurrency}
        departure={departure}
        onDepartureChange={setDeparture}
        checkedOpIds={checkedOpIds}
        onCheckedOpIdsChange={setCheckedOpIds}
        liveOpCounts={liveOpCounts}
        advParams={advParams}
        onAdvParamsChange={setAdvParams}
        isSearching={isSearching}
        onSend={handleSend}
      />
    </div>
  );
}
