import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import Sidebar from './components/Sidebar.jsx';
import ChatArea from './components/ChatArea.jsx';
import InputArea from './components/InputArea.jsx';
import './App.css';

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [catalog, setCatalog] = useState({ operators: [], departures: [], countries: [], meals: [] });
  const [currency, setCurrency] = useState('UZS');
  const [departure, setDeparture] = useState('');
  const [checkedOpIds, setCheckedOpIds] = useState(null);
  const [advParams, setAdvParams] = useState({
    dateFrom: '', dateTo: '', nightsFrom: '', nightsTo: '',
    adults: 2, stars: '', priceTo: '',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [liveOpCounts, setLiveOpCounts] = useState({});

  const abortRef = useRef(null);
  const messagesRef = useRef(messages);
  const prevIsSearchingRef = useRef(false);

  // Keep messagesRef in sync
  messagesRef.current = messages;

  // Load sessions list on mount, then fetch first session's messages
  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(data => {
        setSessions(data);
        if (data.length > 0) {
          const first = data[0];
          setActiveId(first.id);
          fetch(`/api/sessions/${first.id}`)
            .then(r => r.json())
            .then(s => setMessages(s.messages || []))
            .catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

  // Load catalog
  useEffect(() => {
    fetch('/api/catalog')
      .then(r => r.json())
      .then(data => {
        setCatalog(data);
        if (data.departures?.length) setDeparture(String(data.departures[0].id));
      })
      .catch(console.error);
  }, []);

  // Sync messages → local sessions state (for sidebar)
  useEffect(() => {
    if (!activeId) return;
    const toSave = messages.filter(m => m.type !== 'ai' || m.state !== 'searching');
    setSessions(prev =>
      prev.map(s => s.id === activeId ? { ...s, messages: toSave } : s)
    );
  }, [messages, activeId]);

  // Save to backend when search finishes
  useEffect(() => {
    const wasSearching = prevIsSearchingRef.current;
    prevIsSearchingRef.current = isSearching;

    if (wasSearching && !isSearching && activeId) {
      const toSave = messagesRef.current.filter(m => m.type !== 'ai' || m.state !== 'searching');
      fetch(`/api/sessions/${activeId}/messages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: toSave }),
      }).catch(console.error);
    }
  }, [isSearching, activeId]);

  const updateAiMessage = useCallback((id, patch) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const saveCurrentSession = useCallback((id) => {
    const toSave = messagesRef.current.filter(m => m.type !== 'ai' || m.state !== 'searching');
    if (toSave.length === 0) return;
    fetch(`/api/sessions/${id}/messages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toSave }),
    }).catch(console.error);
  }, []);

  const handleNewChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    if (activeId) saveCurrentSession(activeId);
    setMessages([]);
    setActiveId(null);
    setIsSearching(false);
    setLiveOpCounts({});
  }, [activeId, saveCurrentSession]);

  const handleSelectSession = useCallback((id) => {
    if (id === activeId) return;
    if (abortRef.current) abortRef.current.abort();
    if (activeId) saveCurrentSession(activeId);
    setActiveId(id);
    setMessages([]);
    setIsSearching(false);
    setLiveOpCounts({});
    fetch(`/api/sessions/${id}`)
      .then(r => r.json())
      .then(s => setMessages(s.messages || []))
      .catch(console.error);
  }, [activeId, saveCurrentSession]);

  const handleDeleteSession = useCallback((id) => {
    fetch(`/api/sessions/${id}`, { method: 'DELETE' }).catch(console.error);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeId === id) {
      setMessages([]);
      setActiveId(null);
    }
  }, [activeId]);

  const handleSend = useCallback(async (text) => {
    if (isSearching || !text.trim()) return;

    // Create session on backend for new chats
    let curActiveId = activeId;
    if (!curActiveId) {
      const resp = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 60) }),
      });
      const newSession = await resp.json();
      curActiveId = newSession.id;
      setSessions(prev => [newSession, ...prev]);
      setActiveId(curActiveId);
    }

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

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: curActiveId, message: text }),
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
      let lastChunkType = null;

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
            updateAiMessage(aiId, { state: 'error', error: chunk.text });
            return;
          }

          if (chunk.type === 'done' || chunk.done) {
            if (lastChunkType === 'search') {
              updateAiMessage(aiId, {
                state: 'done', hotels: lastHotels, fromCache: lastFromCache,
                progress: 100, operatorsFound: [],
              });
            }
            setLiveOpCounts({});
            return;
          }

          if (chunk.type === 'search' && chunk.search) {
            lastChunkType = 'search';
            const s = chunk.search;
            lastHotels = s.hotels || [];
            lastFromCache = s.from_cache || false;
            updateAiMessage(aiId, {
              progress: s.progress || 0,
              statusText: s.status_text || 'Поиск…',
              hotels: lastHotels,
              fromCache: lastFromCache,
              operatorsFound: s.operators_found || [],
            });
            const counts = {};
            (s.operators_found || []).forEach(op => { counts[op.id] = op.tour_count; });
            setLiveOpCounts(counts);
          }

          if (chunk.type === 'text') {
            lastChunkType = 'text';
            updateAiMessage(aiId, { state: 'text', text: chunk.text });
          }
        }
      }

      if (lastChunkType === 'search') {
        updateAiMessage(aiId, { state: 'done', hotels: lastHotels, fromCache: lastFromCache, progress: 100 });
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        updateAiMessage(aiId, { state: 'error', error: e.message });
      }
    } finally {
      setIsSearching(false);
      abortRef.current = null;
    }
  }, [isSearching, activeId, updateAiMessage]);

  return (
    <div class="app-shell">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onNewChat={handleNewChat}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
      />
      <div class="main-content">
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
    </div>
  );
}
