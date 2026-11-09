import test from 'node:test';
import assert from 'node:assert/strict';
import { rankAttendees } from '../src/rankings.js';
const talks=[{id:'a'},{id:'b'}];
const people=[{id:'one',name:'One',scores:{a:{points:100},b:{points:200}}},{id:'two',name:'Two',scores:{a:{points:300}}},{id:'three',name:'Three',scores:{b:{points:0}}}];
test('totals sum saved talk scores and equal totals share rank',()=>{
 const ranked=rankAttendees(people,talks);
 assert.deepEqual(ranked.map(p=>p.points),[300,300,0]);
 assert.deepEqual(ranked.map(p=>p.rank),[1,1,3]);
 assert.equal(ranked[0].sessions,2);
});
test('individual talk excludes missing scores but includes a saved zero',()=>{
 const ranked=rankAttendees(people,talks,2);
 assert.deepEqual(ranked.map(p=>p.id),['one','three']);
 assert.equal(ranked[1].points,0);
});
test('new backend score reorders the list without adding a duplicate',()=>{
 const updated=people.map(p=>p.id==='three'?{...p,scores:{b:{points:400}}}:p);
 assert.equal(rankAttendees(updated,talks)[0].id,'three');
 assert.equal(rankAttendees(updated,talks).length,3);
});
