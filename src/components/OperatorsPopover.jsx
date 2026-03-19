import { useState, useEffect, useRef } from 'preact/hooks';
import './OperatorsPopover.css';

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
  </svg>
);

export default function OperatorsPopover({
  operators,
  checkedOpIds,
  onCheckedOpIdsChange,
  liveOpCounts,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const popoverId = 'operators-popover';

  const allIds = operators.map(o => o.id);
  const checkedSet = checkedOpIds === null ? new Set(allIds) : new Set(checkedOpIds);
  const allChecked = checkedSet.size === allIds.length;
  const isFiltered = !allChecked;
  const badgeLabel = allChecked ? 'Все' : String(checkedSet.size);

  function toggleOp(id) {
    const next = new Set(checkedSet);
    if (next.has(id)) next.delete(id); else next.add(id);
    const arr = [...next];
    onCheckedOpIdsChange(arr.length === allIds.length ? null : arr);
  }

  function selectAll()  { onCheckedOpIdsChange(null); }
  function selectNone() { onCheckedOpIdsChange([]); }

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;

    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  return (
    <div class="op-wrap" ref={wrapRef}>
      <button
        class={`op-btn ${isFiltered ? 'filtered' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        title="Фильтр по операторам"
      >
        <span class="op-btn-icon"><BuildingIcon /></span>
        <span aria-label={`Операторы: ${badgeLabel}`}>{badgeLabel}</span>
      </button>

      {open && (
        <div class="op-popover" id={popoverId} role="dialog" aria-label="Выбор операторов">
          <div class="op-popover-head">
            <span>Операторы</span>
            <div class="op-popover-acts">
              <button onClick={selectAll}  aria-label="Выбрать всех операторов">Все</button>
              <button onClick={selectNone} aria-label="Снять выбор операторов">Снять</button>
            </div>
          </div>
          <div class="op-scroll" role="group" aria-label="Список операторов">
            {operators.map(op => {
              const count = liveOpCounts[op.id];
              const inputId = `op-${op.id}`;
              return (
                <label key={op.id} class="op-item" htmlFor={inputId}>
                  <input
                    type="checkbox"
                    id={inputId}
                    checked={checkedSet.has(op.id)}
                    onChange={() => toggleOp(op.id)}
                    aria-label={op.name}
                  />
                  <span class="op-name">{op.name}</span>
                  {count != null && (
                    <span class="op-cnt" aria-label={`${count} вариантов`}>{count}</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
