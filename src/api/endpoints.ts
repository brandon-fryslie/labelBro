// [LAW:one-source-of-truth] Flask mounts its whole API under API_PREFIX (the `api` blueprint in label_bro/app.py);
// the client names its routes here and the Vite dev server proxies the prefix, not a copy of the route table.
export const API_PREFIX = '/api';

export const PREVIEW_ENDPOINT = `${API_PREFIX}/previewLabels`;
export const PRINTERS_ENDPOINT = `${API_PREFIX}/printers`;
export const PRINT_ENDPOINT = `${API_PREFIX}/printLabels`;
export const DISCOVERY_ENDPOINT = `${API_PREFIX}/printers/discover`;
export const TEST_ENDPOINT = `${API_PREFIX}/printers/test`;
export const LOG_FRONTEND_ERROR_ENDPOINT = `${API_PREFIX}/log-frontend-error`;
