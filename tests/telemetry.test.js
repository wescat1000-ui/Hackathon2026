import test from 'node:test';
import assert from 'node:assert/strict';
import { telemetryConfig, safeEvent } from '../src/telemetry-config.js';
const configured = { VITE_DASH0_ENABLED: 'true', VITE_DASH0_ENDPOINT: 'https://example.com', VITE_DASH0_AUTH_TOKEN: 'test-only' };
test('monitoring is off unless explicitly enabled and fully configured', () => {
  assert.equal(telemetryConfig({}), null);
  assert.equal(telemetryConfig({ ...configured, VITE_DASH0_ENABLED: 'false' }), null);
  assert.equal(telemetryConfig({ ...configured, VITE_DASH0_AUTH_TOKEN: '' }), null);
});
test('trace headers only go to the exact configured API origin', () => {
  const config = telemetryConfig({ ...configured, VITE_API_ORIGIN: 'https://api.example.com' });
  assert.equal(config.enableTransportCompression, false);
  const pattern = config.propagators[0].match[0];
  assert.ok(pattern.test('https://api.example.com/notes'));
  assert.equal(pattern.test('https://api.example.com.evil.test/notes'), false);
  assert.equal(pattern.test('https://other.example.com/notes'), false);
  assert.equal(config.enabledInstrumentations.includes('@dash0/session-recording'), false);
  assert.equal(config.enabledInstrumentations.includes('@dash0/error'), false);
});
test('invalid endpoints fail validation', () => {
  assert.throws(() => telemetryConfig({ ...configured, VITE_DASH0_ENDPOINT: 'http://example.com' }));
  assert.throws(() => telemetryConfig({ ...configured, VITE_API_ORIGIN: 'https://example.com/api' }));
});
test('workflow events discard private text and unknown event names', () => {
  assert.deepEqual(safeEvent('rally.notes.reviewed', { file_count: 2, has_typed_notes: true, notes: 'private notes', filename: 'private.pdf', talk: 'private title' }), { file_count: 2, has_typed_notes: true });
  assert.equal(safeEvent('private notes', {}), null);
  assert.deepEqual(safeEvent('rally.notes.files_selected', { file_count: 'private', rejected_count: -1 }), {});
});
