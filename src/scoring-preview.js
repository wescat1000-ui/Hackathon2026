// UI fixture, not a scoring algorithm or an API contract.
export const sampleResult = Object.freeze({ score: 84, points: 250, covered: 4, totalIdeas: 5 });
export function previewScoring({ outcome = 'success', signal, delay = 1600 } = {}) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Preview cancelled', 'AbortError')); };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      if (outcome === 'error') reject(new Error('Demo scoring failure'));
      else resolve(sampleResult);
    }, delay);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}
