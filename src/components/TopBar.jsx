import './TopBar.css';

export default function TopBar() {
  return (
    <header class="topbar">
      <div class="topbar-logo">
        <div class="topbar-logo-icon" aria-hidden="true">
          {/* Airplane icon */}
          <svg viewBox="0 0 24 24">
            <path d="M22 2L11 13" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        Welgo<span>sk</span>
      </div>
      <div class="topbar-divider" aria-hidden="true" />
      <div class="topbar-tagline">AI-поиск туров</div>
    </header>
  );
}
