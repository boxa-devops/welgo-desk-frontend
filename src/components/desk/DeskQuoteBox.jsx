import { useState, useEffect } from "preact/hooks";
import { usePostHog } from "../../lib/posthog.jsx";
import "./DeskQuoteBox.css";

const CopyIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    width="14"
    height="14"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    width="14"
    height="14"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
  </svg>
);

export default function DeskQuoteBox({ text }) {
  const posthog = usePostHog();
  const [editedText, setEditedText] = useState(text);
  const [copied, setCopied] = useState(false);

  // Sync when the AI produces a new quote
  useEffect(() => {
    setEditedText(text);
  }, [text]);

  if (!text) return null;

  const handleCopy = async () => {
    posthog.capture("quote_copied");
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = editedText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const rows = Math.max(3, (editedText || "").split("\n").length);

  return (
    <div class="dqb-root">
      <div class="dqb-header">
        <span class="dqb-label">
          <TelegramIcon />
          Готово к отправке клиенту
        </span>
        <button
          class={`dqb-copy-btn ${copied ? "dqb-copy-btn--done" : ""}`}
          onClick={handleCopy}
          title="Скопировать в буфер обмена"
          aria-label="Скопировать сообщение"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Скопировано!" : "Скопировать"}
        </button>
      </div>
      <textarea
        class="dqb-textarea"
        value={editedText}
        rows={rows}
        onInput={(e) => setEditedText(e.target.value)}
        spellcheck={false}
        aria-label="Текст для клиента (редактируемый)"
      />
    </div>
  );
}
