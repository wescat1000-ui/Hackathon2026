import { init, sendEvent, startView } from '@dash0/sdk-web';
import { safeEvent, telemetryConfig } from './telemetry-config';
let active = false;
export function startTelemetry() {
  try {
    const config = telemetryConfig(import.meta.env);
    if (!config || active) return;
    init(config);
    active = true;
  } catch {
    // Observability must never prevent the app from rendering. No credentials in logs.
    console.warn('Rally monitoring is unavailable. Check the Dash0 environment configuration.');
  }
}
export function trackView(view) {
  if (!active || !['Leaderboard','Sessions'].includes(view)) return;
  try { startView(view, { url: `${window.location.origin}/${view.toLowerCase()}` }); } catch { /* fail open */ }
}
export function trackEvent(name, values) {
  const attributes = safeEvent(name, values);
  if (!active || !attributes) return;
  try { sendEvent(name, { data: name, title: name, severity: 'INFO', attributes: { ...attributes, 'rally.mode': 'demo' } }); } catch { /* fail open */ }
}
