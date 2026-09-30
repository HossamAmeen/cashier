/** Shared test environment values (set by infra/scripts/qa-remote.sh on the server). */
export const API_URL = process.env.API_URL ?? '';
export const HEALTH_TOKEN = process.env.HEALTH_CHECK_PASSWORD ?? '';

/** Titles must start with their IDs, e.g. `AC-01 BR-PAY-02 golden path cash payment` (qa-engineer charter). */
export const CSRF_HEADER = { 'X-Requested-With': 'simple-pos' } as const;
