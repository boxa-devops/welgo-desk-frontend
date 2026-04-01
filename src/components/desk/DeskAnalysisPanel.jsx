/**
 * DeskAnalysisPanel — renders the full LLM ai_analysis (table, slots, comparison).
 *
 * The ai_analysis is split on "---":
 *   - Part 1 (verdict) is rendered externally by StructuredResult as a hero block.
 *   - Part 2 (full analysis with table) is rendered here, COLLAPSED by default.
 *
 * Props:
 *   text       — the full ai_analysis string (including verdict + "---" + table)
 *   fromCache  — boolean, shows "cache" badge
 *   totalFound — number, shows "N var." count
 */
import { useState } from 'preact/hooks';
import './DeskAnalysisPanel.css';

// ── Slot visual config — matches tier colors ──
const SLOT_CONFIG = {
  'лучший выбор':     { label: 'Ценность', emoji: '⭐', cls: 'value' },
  'самый дешёвый':    { label: 'Цена',     emoji: '💰', cls: 'budget' },
  'лучший рейтинг':   { label: 'Рейтинг',  emoji: '🏆', cls: 'luxury' },
  'ближайший к морю': { label: 'Море',     emoji: '🏖️', cls: 'beach' },
};

function getSlotCfg(raw) {
  return SLOT_CONFIG[raw.toLowerCase().replace(/[\[\]]/g, '').trim()] ?? null;
}

function splitFlag(desc) {
  const m = desc.match(/^(.*?)\.?\s*Красный флаг[：:]\s*(.+)$/is);
  if (m) return { main: m[1].replace(/\.\s*$/, '').trim(), flag: m[2].trim() };
  return { main: desc, flag: null };
}

function inlineNodes(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

// ── Line patterns ──
const SLOT_RE       = /^\[([^\]]+)\]\s+([^:：]+)[：:]\s*(.*)/;
const COMPARISON_RE = /^Сравнение[：:]\s*(.*)/i;
const REC_RE        = /^\*\*Рекомендация:\*\*\s*/i;
const ACTIONS_RE    = /^\*\*Что можно сделать/i;

function parseToBlocks(raw) {
  const lines = raw.split('\n');
  const blocks = [];
  let listBuf = [];
  let inActions = false;
  let tableRows = [];

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push({ type: inActions ? 'actions-list' : 'list', items: [...listBuf] });
    listBuf = [];
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows.filter(Boolean);
    if (rows.length) blocks.push({ type: 'table', rows });
    tableRows = [];
  };

  for (const line of lines) {
    const t = line.trim();

    if (t.startsWith('|') && t.endsWith('|')) {
      flushList();
      const cells = t.slice(1, -1).split('|').map(c => c.trim());
      tableRows.push(cells.every(c => /^[-:]+$/.test(c)) ? null : cells);
      continue;
    }
    flushTable();

    const slotM = t.match(SLOT_RE);
    if (slotM) {
      const cfg = getSlotCfg(slotM[1]);
      if (cfg) {
        flushList();
        const { main, flag } = splitFlag(slotM[3]);
        blocks.push({ type: 'slot', cfg, hotel: slotM[2].trim(), main, flag });
        inActions = false;
        continue;
      }
    }

    const compM = t.match(COMPARISON_RE);
    if (compM) { flushList(); blocks.push({ type: 'comparison', text: compM[1] }); inActions = false; continue; }

    if (REC_RE.test(t)) { flushList(); blocks.push({ type: 'rec', text: t.replace(REC_RE, '') }); inActions = false; continue; }

    if (ACTIONS_RE.test(t)) { flushList(); blocks.push({ type: 'actions-heading' }); inActions = true; continue; }

    if (/^#{1,3}\s/.test(t)) { flushList(); blocks.push({ type: 'heading', text: t.replace(/^#+\s/, '') }); inActions = false; continue; }

    if (/^[-*]\s/.test(t)) { listBuf.push(t.slice(2)); continue; }

    if (!t) { flushList(); continue; }

    if (t.startsWith('⚠️') || t.startsWith('⚠')) { flushList(); blocks.push({ type: 'warning', text: t }); inActions = false; continue; }

    flushList();
    blocks.push({ type: 'paragraph', text: t });
    inActions = false;
  }

  flushList();
  flushTable();
  return blocks;
}

// ── Sub-components ──

function SlotCard({ block }) {
  const { cfg, hotel, main, flag } = block;
  return (
    <div class={`dap-slot-card dap-slot-card--${cfg.cls}`}>
      <div class="dap-slot-card-head">
        <span class="dap-slot-emoji" aria-hidden="true">{cfg.emoji}</span>
        <span class="dap-slot-label">{cfg.label}</span>
      </div>
      <div class="dap-slot-hotel">{hotel}</div>
      <p class="dap-slot-desc">{main}</p>
      {flag && (
        <div class="dap-slot-flag">
          <span aria-hidden="true">🚩</span>
          <span>{flag}</span>
        </div>
      )}
    </div>
  );
}

function ComparisonBlock({ text }) {
  return (
    <div class="dap-comparison">
      <span class="dap-comparison-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
          <path d="M18 3l3 3-3 3"/><path d="M21 6H3"/>
          <path d="M6 21l-3-3 3-3"/><path d="M3 18h18"/>
        </svg>
        Сравнение
      </span>
      <p class="dap-comparison-text">{inlineNodes(text)}</p>
    </div>
  );
}

function RecCallout({ text }) {
  return (
    <div class="dap-rec-callout">
      <span class="dap-rec-label">👑 Рекомендация</span>
      <p class="dap-rec-body">{inlineNodes(text)}</p>
    </div>
  );
}

function TableBlock({ rows }) {
  if (rows.length < 2) return null;
  const [headers, ...body] = rows;
  const slotIdx = headers.findIndex(h => /^слот$/i.test(h));
  const narrowCols = new Set(
    headers.map((h, i) => /звезд|рейтинг|цена|stars?|rating|price|море/i.test(h) ? i : -1).filter(i => i >= 0)
  );
  return (
    <div class="dap-table-wrap">
      <table class="dap-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i} class={narrowCols.has(i) ? 'dap-th-narrow' : ''}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((cells, ri) => (
            <tr key={ri}>
              {cells.map((c, ci) => {
                if (ci === slotIdx) {
                  const cfg = getSlotCfg(c);
                  return (
                    <td key={ci} class="dap-td-slot">
                      {cfg ? <span class={`dap-slot-chip dap-slot-chip--${cfg.cls}`}>{cfg.label}</span> : c}
                    </td>
                  );
                }
                return <td key={ci} class={narrowCols.has(ci) ? 'dap-td-narrow' : ''}>{inlineNodes(c)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBlocks(blocks) {
  const out = [];
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];

    if (b.type === 'slot') {
      const group = [];
      while (i < blocks.length && blocks[i].type === 'slot') group.push(blocks[i++]);
      out.push(
        <div key={`sg${i}`} class="dap-slot-grid">
          {group.map((s, j) => <SlotCard key={j} block={s} />)}
        </div>
      );
      continue;
    }

    if (b.type === 'comparison') out.push(<ComparisonBlock key={i} text={b.text} />);
    else if (b.type === 'rec') out.push(<RecCallout key={i} text={b.text} />);
    else if (b.type === 'warning') out.push(<p key={i} class="dap-warning">{inlineNodes(b.text)}</p>);
    else if (b.type === 'actions-heading') {
      out.push(
        <div key={i} class="dap-actions-heading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" width="13" height="13">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Что можно сделать
        </div>
      );
    }
    else if (b.type === 'actions-list') {
      out.push(
        <ul key={i} class="dap-actions-list">
          {b.items.map((item, j) => <li key={j} class="dap-actions-item">{inlineNodes(item)}</li>)}
        </ul>
      );
    }
    else if (b.type === 'list') {
      out.push(
        <ul key={i} class="dap-list">
          {b.items.map((item, j) => <li key={j}>{inlineNodes(item)}</li>)}
        </ul>
      );
    }
    else if (b.type === 'heading') out.push(<h3 key={i} class="dap-h3">{inlineNodes(b.text)}</h3>);
    else if (b.type === 'table') out.push(<TableBlock key={i} rows={b.rows} />);
    else if (b.type === 'paragraph') out.push(<p key={i} class="dap-p">{inlineNodes(b.text)}</p>);

    i++;
  }
  return out;
}

// ── Icons ──
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

/**
 * Split ai_analysis on "---" line.
 * Returns { verdict, details } where verdict is Part 1 and details is Part 2.
 */
export function splitAnalysis(raw) {
  if (!raw) return { verdict: '', details: '' };
  const idx = raw.indexOf('\n---\n');
  if (idx === -1) {
    // No separator — try just "---" at line start
    const idx2 = raw.indexOf('\n---');
    if (idx2 === -1) return { verdict: raw.trim(), details: '' };
    return { verdict: raw.slice(0, idx2).trim(), details: raw.slice(idx2 + 4).trim() };
  }
  return { verdict: raw.slice(0, idx).trim(), details: raw.slice(idx + 5).trim() };
}

// ── Main export — shows only the details part, collapsed by default ──
export default function DeskAnalysisPanel({ text, fromCache, totalFound }) {
  const [open, setOpen] = useState(false);

  const { details } = splitAnalysis(text);
  if (!details) return null;

  const blocks = parseToBlocks(details);
  // Extract recommendation for collapsed preview
  const rec = blocks.find(b => b.type === 'rec');
  const recPreview = rec
    ? (rec.text.replace(/\*\*/g, '').trim().slice(0, 85) + (rec.text.length > 85 ? '…' : ''))
    : null;

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
          {!open && recPreview && <span class="dap-header-preview">{recPreview}</span>}
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && <div class="dap-body">{renderBlocks(blocks)}</div>}
    </div>
  );
}
