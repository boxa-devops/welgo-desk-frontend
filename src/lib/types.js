/**
 * Frontend type definitions mirroring backend Pydantic schemas.
 *
 * Canonical source: app/schemas/ in welgo-desk-backend.
 * All field names are snake_case (matching JSON responses).
 *
 * These are JSDoc typedefs — no runtime cost, but enables
 * IDE autocomplete and catches field name typos.
 */

// ─── Tour / Hotel schemas (app/schemas/tour.py) ─────────────────────────────

/**
 * @typedef {'budget' | 'value' | 'luxury' | 'risky' | 'beach'} ValueTier
 */

/**
 * One departure date option for a hotel card.
 * @typedef {Object} TourDateOption
 * @property {string} date - YYYY-MM-DD
 * @property {number} price_uzs
 * @property {number} price_usd_approx
 * @property {string} tour_id
 * @property {number} nights
 * @property {boolean} is_charter
 */

/**
 * One hotel card rendered by the React frontend.
 * @typedef {Object} UIHotel
 * @property {string} hotel_id
 * @property {string} tour_id
 * @property {string} hotel_name
 * @property {number} stars - 1-5
 * @property {number} rating - 0-10
 * @property {number} price_uzs
 * @property {number} price_usd_approx
 * @property {string|null} image_url
 * @property {string} region
 * @property {number|null} sea_distance_m - metres, null if unknown
 * @property {string[]} features
 * @property {string} meal_plan
 * @property {string} operator
 * @property {number|null} operator_id
 * @property {number} nights
 * @property {string} departure_date - YYYY-MM-DD
 * @property {boolean} is_charter
 * @property {ValueTier} value_tier
 * @property {TourDateOption[]} tour_dates
 */

/**
 * Filter bounds for price slider and filter pills.
 * @typedef {Object} AvailableFilters
 * @property {number} min_price_uzs
 * @property {number} max_price_uzs
 * @property {string[]} meal_plans
 * @property {string[]} operators
 * @property {number[]} stars_available
 */

// ─── Desk schemas (app/schemas/desk.py) ──────────────────────────────────────

/**
 * @typedef {Object} DeskMeta
 * @property {number} total_options_found
 * @property {string|null} search_id
 * @property {boolean} from_cache
 */

/**
 * @typedef {Object} QuickAction
 * @property {string} label
 * @property {string} message
 */

/**
 * Structured LLM response — rendered as GenUI.
 * @typedef {Object} DeskResponse
 * @property {string} ai_analysis - Markdown
 * @property {string} client_quote - Copy-paste Telegram message
 * @property {UIHotel[]} ui_hotels
 * @property {AvailableFilters} available_filters
 * @property {DeskMeta} meta
 * @property {QuickAction[]} quick_actions
 */

/**
 * @typedef {Object} ClientInfo
 * @property {string|null} name
 * @property {string|null} phone
 * @property {string|null} notes
 */

/**
 * POST /api/desk/chat request body.
 * @typedef {Object} DeskChatRequest
 * @property {string} message
 * @property {string} session_id
 * @property {string[]} blacklist
 * @property {Array<{action: string, hotel_name: string, reason: string}>} context_actions
 * @property {ClientInfo} [client_info]
 */

/**
 * POST /api/desk/filter request body.
 * @typedef {Object} FilterRequest
 * @property {string} session_id
 * @property {number|null} [price_min]
 * @property {number|null} [price_max]
 * @property {number|null} [stars_min]
 * @property {string|null} [meal_plan]
 * @property {string|null} [operator]
 */

// ─── Agent strategy / reasoning (app/schemas/desk.py) ────────────────────────

/**
 * @typedef {'family_beach'|'couple_romantic'|'solo_adventure'|'business_quick'|'luxury_relaxation'|'budget_getaway'} TravelProfile
 */

/**
 * Hidden agent reasoning metadata — displayed in the "Thought" panel.
 * @typedef {Object} AgentThought
 * @property {string} intent_summary - What the client actually wants
 * @property {TravelProfile} travel_profile - Inferred traveler type
 * @property {number} confidence - 0-1 search confidence score
 * @property {string[]} missing_info - Key info not provided
 * @property {string[]} tool_plan - Ordered tool execution plan
 * @property {string} search_hints - Expert hints for the analysis step
 */

// ─── Alternative strategies (app/schemas/desk.py) ────────────────────────────

/**
 * One concrete action-button the agent can click after zero search results.
 * @typedef {Object} AlternativeSuggestion
 * @property {string} label - Short button text (max ~40 chars)
 * @property {string} message - Full search query to send on click
 * @property {string} why - One-sentence explanation
 */

/**
 * LLM-generated recovery plan on zero search results.
 * @typedef {Object} AlternativeStrategy
 * @property {string} diagnosis - Professional explanation of WHY zero results
 * @property {AlternativeSuggestion[]} suggestions - 2-4 clickable next-step actions
 * @property {string} market_insight - Expert context about destination/season
 * @property {Object} partial - Partial extracted params for context
 */

// ─── SSE event types (app/core/events.py) ────────────────────────────────────

/**
 * @typedef {'status'|'progress'|'analysis_stream'|'result'|'clarify'|'plain'|'done'|'error'|'gather_client'|'thought'|'alternatives'} SSEEventType
 */

// ─── Auth schemas (app/schemas/auth.py) ──────────────────────────────────────

/**
 * Profile + org info returned by GET /api/auth/me.
 * @typedef {Object} UserProfile
 * @property {string} profile_id
 * @property {string} user_id
 * @property {string} full_name
 * @property {'admin'|'agent'} role
 * @property {string} org_id
 * @property {string} org_name
 * @property {string} plan
 * @property {boolean} is_enabled
 * @property {number} credits_limit
 * @property {number} credits_used
 * @property {string|null} credits_reset_at - ISO datetime
 * @property {number} seats_limit
 * @property {number} seats_used
 */

// ─── Domain error codes (app/core/exceptions.py) ─────────────────────────────

/**
 * Known backend error patterns.
 * Match against `detail` field in 403/503 JSON responses.
 */
export const ERROR_PATTERNS = {
  /** Org monthly credit pool exhausted */
  CREDITS_EXHAUSTED: /лимит поисков исчерпан/i,
  /** Org disabled by superadmin */
  ORG_DISABLED: /организация деактивирована/i,
  /** Profile not found — user needs to register */
  PROFILE_NOT_FOUND: /профиль не найден|profile not found/i,
  /** Desk agent not configured (missing LLM token) */
  DESK_NOT_CONFIGURED: /not configured|DEEPSEEK_TOKEN/i,
  /** DB not configured */
  DB_NOT_CONFIGURED: /database not configured|POSTGRES_DSN/i,
};

/**
 * Parse a backend error response into a user-friendly message.
 * @param {number} status - HTTP status code
 * @param {string} detail - Error detail from response JSON
 * @returns {{ message: string, type: 'credits'|'disabled'|'auth'|'config'|'generic' }}
 */
export function parseApiError(status, detail) {
  if (status === 403) {
    if (ERROR_PATTERNS.CREDITS_EXHAUSTED.test(detail)) {
      return { message: detail, type: "credits" };
    }
    if (ERROR_PATTERNS.ORG_DISABLED.test(detail)) {
      return { message: detail, type: "disabled" };
    }
    if (ERROR_PATTERNS.PROFILE_NOT_FOUND.test(detail)) {
      return {
        message: "Профиль не найден. Пройдите регистрацию.",
        type: "auth",
      };
    }
    return { message: detail, type: "generic" };
  }

  if (status === 503) {
    if (ERROR_PATTERNS.DESK_NOT_CONFIGURED.test(detail)) {
      return {
        message: "Сервис временно недоступен. Попробуйте позже.",
        type: "config",
      };
    }
    return {
      message: "Сервис временно недоступен. Попробуйте позже.",
      type: "config",
    };
  }

  if (status === 404) {
    return { message: detail || "Не найдено", type: "generic" };
  }

  return { message: detail || `Ошибка сервера (${status})`, type: "generic" };
}
