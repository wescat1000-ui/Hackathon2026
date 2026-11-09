import test from 'node:test';
import assert from 'node:assert/strict';
import { previewScoring, sampleResult } from '../src/scoring-preview.js';
test('preview returns the fixed design fixture', async()=>{
 assert.deepEqual(await previewScoring({delay:0}),sampleResult);
});
test('preview failure can be retried successfully',async()=>{
 await assert.rejects(previewScoring({outcome:'error',delay:0}),/Demo scoring failure/);
 assert.equal((await previewScoring({delay:0})).points,250);
});
test('cancelling rejects instead of returning a late score',async()=>{
 const controller=new AbortController();
 const pending=previewScoring({signal:controller.signal,delay:100});
 controller.abort();
 await assert.rejects(pending,{name:'AbortError'});
});
test('already cancelled requests never produce a result',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(previewScoring({signal:controller.signal}),{name:'AbortError'});
});
