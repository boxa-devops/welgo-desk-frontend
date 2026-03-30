/**
 * DeskAnalysisPanel — renders the LLM ai_analysis as an expandable section.
 *
 * Since the analysis is now a concise conversational verdict (3-5 sentences),
 * this panel is COLLAPSED by default. The recommendation callout is extracted
 * separately and shown as a hero block above the cards (handled by StructuredResult).
 *
 * This panel serves as the "deep dive" for agents who want the full reasoning.
 */
import { useState } from 'preact/hooks';
import './DeskAnalysisPanel.css';

// Inline **bold** renderer
function inlineNodes(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

// Parse raw verdict text into simple paragraph blocks
function parseToBlocks(raw) {
  const lines = raw.split('\n');
  const blocks = [];
  let listBuf = [];

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push({ type: 'list', items: [...listBuf] });
    listBuf = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flushList(); continue; }

    // ⚠️ Warning paragraph
    if (t.startsWith('⚠️') || t.startsWith('⚠')) {
      flushList();
      blocks.push({ type: 'warning', text: t });
      continue;
    }

    // List item
    if (/^[-*]\s/.test(t)) {
      listBuf.push(t.slice(2));
      continue;
    }

    // Heading
    if (/^#{1,3}\s/.test(t)) {
      flushList();
      blocks.push({ type: 'heading', text: t.replace(/^#+\s/, '') });
      continue;
    }

    // Normal paragraph
    flushList();
    blocks.push({ type: 'paragraph', text: t });
  }

  flushList();
  return blocks;
}

function renderBlocks(blocks) {
  return blocks.map((b, i) => {
    if (b.type === 'warning')
      return <p key={i} class="dap-warning">{inlineNodes(b.text)}</p>;
    if (b.type === 'heading')
      return <h3 key={i} class="dap-h3">{inlineNodes(b.text)}</h3>;
    if (b.type === 'list')
      return (
        <ul key={i} class="dap-list">
          {b.items.map((item, j) => <li key={j}>{inlineNodes(item)}</li>)}
        </ul>
      );
    return <p key={i} class="dap-p">{inlineNodes(b.text)}</p>;
  });
}

// Extract first bold sentence for collapsed preview
function extractPreview(raw) {
  const m = raw.match(/\*\*([^*]+)\*\*/);
  if (m) {
    const t = m[1].trim();
    return t.length > 90 ? t.slice(0, 90) + '…' : t;
  }
  const first = raw.split('\n').find(l => l.trim());
  if (!first) return null;
  const plain = first.replace(/\*\*/g, '').trim();
  return plain.length > 90 ? plain.slice(0, 90) + '…' : plain;
}

// Icons
const ChevronIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
    stroke-linecap="round" stroke-linejoin="round" width="14" height="14"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const AnalysisIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

// Main export — collapsed by default
export default function DeskAnalysisPanel({ text, fromCache, totalFound }) {
  const [open, setOpen] = useState(false);  // collapsed by default
  if (!text) return null;

  const blocks = parseToBlocks(text);
  const preview = extractPreview(text);

  return (
    <div class={`dap-root${open ? ' dap-root--open' : ''}`}>
      <button class="dap-header" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span class="dap-header-left">
          <span class="dap-header-icon"><AnalysisIcon /></span>
          <span class="dap-header-label">Подробный разбор</span>
          {totalFound > 0 && <span class="dap-meta-count">{totalFound} вар.</span>}
          {fromCache && <span class="dap-cache-badge">кэш</span>}
        </span>
        <span class="dap-header-right">
          {!open && preview && <span class="dap-header-preview">{preview}</span>}
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && <div class="dap-body">{renderBlocks(blocks)}</div>}
    </div>
  );
}
