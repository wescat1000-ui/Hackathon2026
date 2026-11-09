const base = (import.meta.env.VITE_API_ORIGIN || 'http://127.0.0.1:8000').replace(/\/$/, '');
export async function apiRequest(path, { signal, body } = {}) {
  const timeout = new AbortController();
  const abort = () => timeout.abort();
  const timer = setTimeout(abort, 120000);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  try {
    const response = await fetch(`${base}${path}`, {
      signal: timeout.signal, method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'The request could not be completed.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request was interrupted or timed out. Your draft is still here.');
    if (error instanceof TypeError) throw new Error('Cannot reach the scoring backend. Check that your partner’s API is running and the backend address is correct.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
export function browserAttendee() {
  try {
    const stored = JSON.parse(localStorage.getItem('rally-demo-attendee'));
    if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored.id)) return { id: stored.id, name: typeof stored.name === 'string' ? stored.name : '' };
  } catch { /* storage can be unavailable */ }
  return { id: crypto.randomUUID(), name: '' };
}
export function saveAttendee(attendee) {
  try { localStorage.setItem('rally-demo-attendee', JSON.stringify(attendee)); } catch { /* identity remains in app memory */ }
}
