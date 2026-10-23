import test from 'node:test';
import assert from 'node:assert/strict';
import { requireUser, assertOwner, keyOwner, privateCacheKey, readJson } from '../app/lib/security.mjs';

test('missing and malformed credentials never contact auth', async () => {
  for (const value of ['', 'Bearer', 'Basic secret', 'Bearer a b']) {
    await assert.rejects(requireUser(new Request('https://example.test', {headers:{authorization:value}}), () => {throw Error('must not call');}), {status:401});
  }
});
test('client account identifiers cannot select another account', () => {
  assert.throws(() => assertOwner('victim', 'attacker'), {status:403});
  assert.doesNotThrow(() => assertOwner(undefined, 'verified'));
  assert.doesNotThrow(() => assertOwner('verified', 'verified'));
});
test('session identity comes from verified auth response', async () => {
  const previous = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.example.test'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-test-key';
  const request = new Request('https://example.test', {headers:{authorization:'Bearer valid-session'}});
  try {
    const user = await requireUser(request, async (url, options) => {
      assert.equal(String(url), 'https://auth.example.test/auth/v1/user');
      assert.equal(options.headers.authorization, 'Bearer valid-session');
      assert.equal(options.cache, 'no-store');
      return Response.json({id:'verified', email:'demo@example.test'});
    });
    assert.equal(user.id,'verified');
    await assert.rejects(requireUser(request, async()=>new Response('',{status:401})),{status:401});
    await assert.rejects(requireUser(request, async()=>{throw Error('offline');}),{status:503});
  } finally {
    for (const [i,key] of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'].entries()) {
      if(previous[i]===undefined) delete process.env[key]; else process.env[key]=previous[i];
    }
  }
});
test('API keys must exist and still be current after rotation', async () => {
  const key='ts_live_'+'a'.repeat(32);
  const values=new Map([['key_owner:'+key,JSON.stringify({userId:'owner'})],['user_key:owner',key]]);
  const redis={get:async k=>values.get(k)};
  assert.equal(await keyOwner(redis,key),'owner');
  values.set('user_key:owner','rotated');
  await assert.rejects(keyOwner(redis,key),{status:401});
  await assert.rejects(keyOwner(redis,'ts_live_'+'z'.repeat(32)),{status:401});
  await assert.rejects(keyOwner(null,key),{status:503});
});
test('cache isolates credentials, providers, requested models and quality', () => {
  const args=[[{role:'user',content:'hello'}],'openai','gpt-4o','auto','credential-one'];
  const original=privateCacheKey(...args);
  for (const i of [1,2,3,4]) { const changed=[...args]; changed[i]+='-different'; assert.notEqual(privateCacheKey(...changed),original); }
  assert.equal(privateCacheKey(...args),original);
  assert.ok(!original.includes('credential-one'));
  assert.notEqual(privateCacheKey([{role:'user',content:'a|assistant:b'}],...args.slice(1)),privateCacheKey([{role:'user',content:'a'},{role:'assistant',content:'b'}],...args.slice(1)));
});
test('actual bytes are bounded even without a content-length header', async () => {
  const request = body => new Request('https://example.test',{method:'POST',body});
  await assert.rejects(readJson(request(JSON.stringify({text:'é'.repeat(20)})),30),{status:413});
  await assert.rejects(readJson(request('null')),{status:400});
  await assert.rejects(readJson(request('[]')),{status:400});
  await assert.rejects(readJson(request('{bad')),{status:400});
  assert.deepEqual(await readJson(request('{"valid":true}')),{valid:true});
});
