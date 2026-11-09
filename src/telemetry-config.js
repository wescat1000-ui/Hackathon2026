export function telemetryConfig(env) {
  if (env.VITE_DASH0_ENABLED !== 'true') return null;
  if (!env.VITE_DASH0_ENDPOINT || !env.VITE_DASH0_AUTH_TOKEN) return null;
  const endpoint = new URL(env.VITE_DASH0_ENDPOINT);
  if (endpoint.protocol !== 'https:') throw new Error('Dash0 endpoint must use HTTPS');
  const propagators = [];
  if (env.VITE_API_ORIGIN) {
    const api = new URL(env.VITE_API_ORIGIN);
    if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.pathname !== '/' || api.search || api.hash) throw new Error('VITE_API_ORIGIN must be an HTTP(S) origin without a path');
    const escaped = api.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    propagators.push({ type: 'traceparent', match: [new RegExp(`^${escaped}(?:/|$)`)] });
  }
  return {
    serviceName: 'rally-frontend', serviceNamespace: 'rally',
    environment: env.MODE || 'development', disableVcsDetection: true,
    endpoint: { url: endpoint.href, authToken: env.VITE_DASH0_AUTH_TOKEN, dataset: env.VITE_DASH0_DATASET || 'default' },
    // Dash0's ingress preflight currently rejects Content-Encoding from this origin.
    enableTransportCompression: false,
    enabledInstrumentations: ['@dash0/navigation', '@dash0/web-vitals', '@dash0/fetch', '@dash0/xhr'],
    propagators,
  };
}
// Deliberate allowlist: never pass drafts, file names, search text, names, or errors.
const eventFields = {
  'rally.notes.files_selected': ['file_count', 'rejected_count'],
  'rally.notes.reviewed': ['file_count', 'has_typed_notes'],
  'rally.notes.demo_saved': ['file_count', 'has_typed_notes'],
};
export function safeEvent(name, values = {}) {
  if (!eventFields[name]) return null;
  return Object.fromEntries(eventFields[name].filter(key => typeof values[key] === 'boolean' || (typeof values[key] === 'number' && Number.isFinite(values[key]) && values[key] >= 0)).map(key => [key, values[key]]));
}
