// Creates two disposable guest users and test tasks. Uses only the public key.
// Test tasks are deleted in finally; guest auth records remain in the project.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Set the Supabase URL and public anon key in .env first.');
const fresh = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const a = fresh(), b = fresh(), unauthenticated = fresh();
const guests = [];
const fixtureIds = [];
async function createFixture(client, owner, suffix) {
  const { data, error } = await client.from('tasks').insert({ title: `RLS verification ${suffix} ${crypto.randomUUID()}`, user_id: owner }).select().single();
  assert.ifError(error); fixtureIds.push([client, data.id]); return data;
}
try {
  for (const client of [a, b]) {
    const { data, error } = await client.auth.signInAnonymously();
    assert.ifError(error); assert.ok(data.user); guests.push(data.user);
  }
  assert.notEqual(guests[0].id, guests[1].id);
  const taskA = await createFixture(a, guests[0].id, 'A');
  const taskB = await createFixture(b, guests[1].id, 'B');
  for (const [client, foreign] of [[b, taskA], [a, taskB]]) {
    const read = await client.from('tasks').select('*').eq('id', foreign.id);
    assert.ifError(read.error); assert.deepEqual(read.data, [], 'Foreign tasks must be invisible');
    const update = await client.from('tasks').update({ title: 'Unauthorized edit' }).eq('id', foreign.id).select();
    assert.ifError(update.error); assert.deepEqual(update.data, [], 'Foreign tasks must not be editable');
    const deletion = await client.from('tasks').delete().eq('id', foreign.id).select();
    assert.ifError(deletion.error); assert.deepEqual(deletion.data, [], 'Foreign tasks must not be deletable');
  }
  const spoof = await b.from('tasks').insert({ title: 'Spoofed owner', user_id: guests[0].id });
  assert.ok(spoof.error, 'Creating a task for another owner must fail');
  const transfer = await a.from('tasks').update({ user_id: guests[1].id }).eq('id', taskA.id);
  assert.ok(transfer.error, 'Changing ownership must fail');
  const readWithoutSession = await unauthenticated.from('tasks').select('*');
  assert.ok(readWithoutSession.error || readWithoutSession.data?.length === 0, 'Unauthenticated clients must not see tasks');
  const saved = await a.from('tasks').update({ status: 'done' }).eq('id', taskA.id).select().single();
  assert.ifError(saved.error); assert.equal(saved.data.status, 'done');
  const session = await a.auth.getSession();
  const resumed = fresh();
  const restored = await resumed.auth.setSession({ access_token: session.data.session.access_token, refresh_token: session.data.session.refresh_token });
  assert.ifError(restored.error);
  const persisted = await resumed.from('tasks').select('*').eq('id', taskA.id).single();
  assert.ifError(persisted.error); assert.equal(persisted.data.status, 'done');
  console.log('PASS: guest creation, persistence, owner updates, and cross-user read/write/delete isolation.');
} finally {
  for (const [client, id] of fixtureIds) {
    const { error } = await client.from('tasks').delete().eq('id', id);
    if (error) console.error('Test fixture cleanup failed:', error.message);
  }
  console.log('The two test guest auth records remain; no service role key was used.');
}
