import test from 'node:test';
import assert from 'node:assert/strict';
import { redundantSnapshots } from '../server/retention.js';
const entry=(id,date,prefix='snapshots')=>({pathname:`moagem/${prefix}/${id.repeat(64)}.json`,uploadedAt:date});
test('retenção remove apenas cópias redundantes antigas; conserva atual, duas recentes e histórico',()=>{
  const entries=[entry('a','2026-01-01'),entry('b','2026-02-01'),entry('c','2026-03-01'),entry('d','2026-10-01'),entry('e','2026-10-13'),entry('f','2026-01-01','history'),{pathname:'moagem/state.json',uploadedAt:'2020-01-01'},entry('9','invalid')];
  const selected=redundantSnapshots(entries,entries[0].pathname,'2026-10-14');
  assert.deepEqual(selected.map(f=>f.pathname).sort(),[entries[1].pathname,entries[2].pathname].sort());
  assert.equal(redundantSnapshots(entries.slice(0,2),null,'2027-10-14').length,0);
});
