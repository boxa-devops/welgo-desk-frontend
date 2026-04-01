# Welgo Desk Frontend

Travel agency desk application — an AI-powered tool for travel agents to search tours, compare hotels, and generate client quotes.

## Tech Stack

- **Framework**: Preact (not React) — imports from `preact` and `preact/hooks`
- **Build**: Vite 8 with `@preact/preset-vite`
- **Auth**: Supabase Auth (email/password)
- **Analytics**: PostHog
- **Language**: JavaScript (.jsx/.js) — no TypeScript, but JSDoc typedefs in `src/lib/types.js`
- **i18n**: Custom lightweight system (`src/lib/i18n/`) with Russian (`ru.js`) and Uzbek (`uz.js`)
- **Styling**: Plain CSS (co-located `.css` files per component, BEM-ish naming)
- **No router** — hash-based view switching via `activeView` state in `App.jsx`

## Project Structure

```
src/
  main.jsx                  # Entry point, PostHog init, render
  App.jsx                   # Root shell: auth gate, sidebar, view switching
  App.css
  index.css                 # Global styles / CSS variables
  utils.js                  # Formatting helpers (fmtUzs, stars, pickHighlights)
  components/
    Sidebar.jsx             # Navigation + conversation list
    ProfilePage.jsx         # User profile settings
    SuperAdminPage.jsx      # Admin panel (accessible via #superadmin hash)
    auth/
      LoginPage.jsx         # Login/register form (Supabase auth)
      OnboardingPage.jsx    # Org creation or invite-code join flow
    desk/
      DeskView.jsx          # Main desk: chat + SSE streaming + hotel results
      DeskHotelCard.jsx     # Individual hotel card with date pills, tier badges
      DeskQuoteBox.jsx      # Copy-paste Telegram quote for client
      DeskAnalysisPanel.jsx # Collapsible AI analysis with slot cards, tables
      DeskFilterBar.jsx     # Price/stars/meal/operator filters
      DeskAllHotelsModal.jsx # Full hotel grid modal with compare feature
      TourPromptBuilder.jsx # Guided tour search prompt builder
  lib/
    api.js                  # apiFetch() — wraps fetch with Supabase Bearer token
    AuthContext.jsx          # Auth context provider (session, profile, signOut)
    supabase.js             # Supabase client init
    posthog.jsx             # PostHog context
    types.js                # JSDoc typedefs mirroring backend Pydantic schemas
    i18n/
      index.jsx             # I18nProvider + useI18n hook
      ru.js                 # Russian translations
      uz.js                 # Uzbek translations
```

## Key Patterns

### API Communication
- All API calls go through `apiFetch()` from `src/lib/api.js` — it auto-attaches Supabase Bearer token
- Backend is proxied via Vite dev server: `/api` -> `WELGO_DESK_BACKEND_URL` (default `http://localhost:8000`)
- Main desk chat uses **SSE streaming** (EventSource pattern) — not WebSocket
- Backend schemas are documented in `src/lib/types.js` as JSDoc typedefs

### Auth Flow
1. `LoginPage` — Supabase email/password sign-in or sign-up
2. `OnboardingPage` — create org or join via invite code (POST `/api/auth/register-org` or `/api/auth/join`)
3. `PendingApprovalPage` — shown when `profile.is_enabled === false`
4. Profile fetched from `GET /api/auth/me`

### Session Management
- Multiple desk sessions can be mounted simultaneously (kept alive in DOM)
- Sessions tracked by `mountedSessions` state with UUID-based session IDs
- Conversations persisted via `/api/desk/conversations` CRUD endpoints

### Styling Conventions
- CSS custom properties defined in `index.css` (e.g., `--text`, `--muted`, `--border`, `--radius`)
- Component-scoped CSS with prefixed class names (e.g., `dhcard-*`, `dap-*`, `dfb-*`, `dahm-*`)
- No CSS modules or CSS-in-JS — plain co-located `.css` files

### UI Language
- The UI is primarily in **Russian** — labels, placeholders, analysis text are all in Russian
- i18n keys used for auth and common UI; domain-specific text (hotel analysis, filters) often hardcoded in Russian

## Environment Variables

```
VITE_SUPABASE_URL          # Supabase project URL
VITE_SUPABASE_ANON_KEY     # Supabase anon/publishable key
VITE_PUBLIC_POSTHOG_PROJECT_TOKEN  # PostHog project token
VITE_PUBLIC_POSTHOG_HOST   # PostHog API host
WELGO_DESK_BACKEND_URL     # Backend URL for Vite proxy (default: http://localhost:8000)
```

## Commands

```bash
npm run dev      # Start Vite dev server with backend proxy
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Code Context (IMPORTANT)

**Do NOT traverse the project directory or read individual source files.** All source code context is pre-packed in `.context-fe.md` at the repository root. When you need to understand the codebase, read from `.context-fe.md` instead of globbing/grepping through `src/`. This file contains all relevant source files merged into a single document, sorted by change frequency, with comments stripped.

Only read individual files directly when you need to **edit** them.

## Important Notes

- This is **Preact**, not React — use `preact/hooks`, `preact/compat` if needed. No `react` or `react-dom` imports.
- No test framework is configured. No linter/formatter config files present.
- The backend is a separate repo (`welgo-desk-backend`) with FastAPI + Pydantic. Type definitions in `src/lib/types.js` mirror those schemas.
- Hotel data comes from Tourvisor API (operator logos: `tourvisor.ru/pics/operators/mobilelogo/{id}.png`).
- Currency is primarily UZS (Uzbek som) with USD approximations. Use `fmtUzs()` from `utils.js` for display.
- Static HTML entry point is at `static/index.html`, not `index.html` in root.
