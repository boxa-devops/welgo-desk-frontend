import { useEffect, useRef } from 'preact/hooks';
import MessageBubble from './MessageBubble.jsx';
import { CHIPS } from '../utils.js';
import './ChatArea.css';

function Welcome({ onChipClick }) {
  return (
    <div class="welcome-wrap">
      <div class="welcome-icon" aria-hidden="true">
        {/* Globe / destination icon */}
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      </div>
      <div class="welcome-title">Привет! Я помогу найти тур</div>
      <div class="welcome-sub">
        Расскажите, куда хотите поехать — я найду лучшие предложения от всех операторов.
      </div>
      <div class="chip-row" role="list" aria-label="Примеры запросов">
        {CHIPS.map(c => (
          <button key={c} class="chip" role="listitem" onClick={() => onChipClick(c)}>{c}</button>
        ))}
      </div>
    </div>
  );
}

export default function ChatArea({ messages, currency, onChipClick, showWelcome }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [messages]);

  return (
    <div class="chat-scroll" ref={scrollRef} role="log" aria-live="polite" aria-label="История переписки">
      <div class="chat-messages">
        {showWelcome && <Welcome onChipClick={onChipClick} />}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} currency={currency} />
        ))}
      </div>
    </div>
  );
}
