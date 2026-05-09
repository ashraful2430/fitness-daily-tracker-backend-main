Build the frontend against this personal productivity/finance backend with a fast, friendly, slightly savage tone. Keep it playful, never mean.

Response handling:
- Treat API responses as `{ success: boolean, message?: string, data?: unknown, pagination?: unknown }`.
- Always show `message` from the backend when present. These messages are intentionally friendly and witty.
- For success toasts, use calm positive styling and short display duration.
- For errors, show the backend message clearly near the form field when `field` is returned, otherwise use a toast or inline page alert.
- Do not replace backend messages with generic copy unless the network request failed before a response arrived.

UX tone:
- Use compact, personal-dashboard language.
- Good examples: "Saved. Future you just got a cleaner dashboard.", "Wallet said sit down.", "Money does not spawn from vibes."
- Avoid brutal, insulting, or guilt-heavy copy. The app should feel like a witty assistant, not a bully.

Data flows to support:
- Expenses: create/update works with optional `note`; blank notes are valid.
- Income and savings: create works with optional `note`; blank notes are valid.
- Loans: create works with optional `reason`; if omitted, backend stores `No reason provided.`
- Lending: note/reason-style fields are optional; borrowed lending may create a linked loan automatically.
- Learning sessions: `notes` may be missing, null, or blank.

Performance expectations:
- Use pagination values returned by the backend instead of fetching huge lists.
- Debounce filters/search fields.
- Cache read-heavy dashboard/list requests briefly on the client.
- Revalidate after mutations instead of refetching every page blindly.

Interface guidance:
- Build the actual app screen first, not a marketing landing page.
- Make dashboards dense but readable: summary metrics, recent activity, quick-add forms, and paginated lists.
- Use concise empty states with one useful action.
- Keep destructive actions confirmed but lightweight.
