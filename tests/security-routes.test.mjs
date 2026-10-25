import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as security from '../app/lib/security.mjs';
const nativeRequire = createRequire(import.meta.url);
let compile;
try {
  const {default:ts}=await import('typescript');
  compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
} catch {
  // Dependency-free execution in Node 24; normal CI uses the installed compiler.
  const {stripTypeScriptTypes}=await import('node:module');
  compile=source=>stripTypeScriptTypes(source).replace(/^import .*? from ["']([^"']+)["'];$/gm,(_,name)=> {
    const line=source.split('\n').find(l=>l.includes('from "'+name+'"')||l.includes("from '"+name+"'"));
    return 'const '+line.match(/import (.*?) from/)[1]+' = require('+JSON.stringify(name)+');';
  }).replace(/export async function (\w+)\(/g,'exports.$1 = async function $1(');
}
function loadRoute(name, redis) {
  const source=fs.readFileSync(new URL('../app/api/'+name+'/route.ts',import.meta.url),'utf8');
  const module={exports:{}};
  const require=name=>name==='next/server'?{NextRequest:Request,NextResponse:Response}:name==='@upstash/redis'?{Redis:class {constructor(){return redis;}}}:name.endsWith('security.mjs')?security:nativeRequire(name);
  new Function('require','exports','module',compile(source))(require,module.exports,module);
  return module.exports;
}
function storage() {
  const calls=[];const values=new Map();
  return { calls,values,
    get:async key=>{calls.push(key);return values.get(key)||null;},
    hgetall:async key=>{calls.push(key);return {};},
    lrange:async key=>{calls.push(key);return [];},
    set:async (key,value)=>{calls.push(key);values.set(key,value);},
    del:async key=>{calls.push(key);values.delete(key);},
    incr:async()=>1,expire:async()=>{},hincrby:async()=>{},lpush:async()=>{},ltrim:async()=>{},setex:async()=>{},
  };
}
const request=(body,token)=>new Request('https://app.example.test/api/test',{method:'POST',headers:token?{authorization:'Bearer '+token}:{},body:JSON.stringify(body)});
test('management routes reject missing sessions and forged owner IDs before database access',async()=>{
  const oldFetch=globalThis.fetch;const previous=[process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.example.test';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';
  globalThis.fetch=async()=>Response.json({id:'attacker',email:'attacker@example.test'});
  try {
    for (const name of ['generate-key','teams','webhooks']) {
      const redis=storage();const {POST}=loadRoute(name,redis);
      assert.equal((await POST(request({userId:'victim'}))).status,401,name);
      assert.equal((await POST(request({userId:'victim'},'verified'))).status,403,name);
      assert.deepEqual(redis.calls,[],name);
    }
  } finally {globalThis.fetch=oldFetch;for(const [i,key] of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'].entries()){if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];}}
});
test('statistics only read the verified account namespace',async()=>{
  const oldFetch=globalThis.fetch;const previous=[process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.example.test';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';
  globalThis.fetch=async()=>Response.json({id:'owner'});
  try {
    const redis=storage();const {GET}=loadRoute('stats',redis);
    assert.equal((await GET(new Request('https://app.example.test'))).status,401);
    assert.equal((await GET(new Request('https://app.example.test',{headers:{authorization:'Bearer valid'}}))).status,200);
    assert.ok(redis.calls.length>0);
    assert.ok(redis.calls.every(k=>k.includes(':owner')),JSON.stringify(redis.calls));
  } finally {globalThis.fetch=oldFetch;for(const [i,key] of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'].entries()){if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];}}
});
test('a forged API-key prefix does not authorize audit log access',async()=>{
  const previous=[process.env.UPSTASH_REDIS_REST_URL,process.env.UPSTASH_REDIS_REST_TOKEN];
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  try {
  const redis=storage();const {GET}=loadRoute('audit',redis);
  const key='ts_live_'+'a'.repeat(32);
  assert.equal((await GET(new Request('https://app.example.test',{headers:{authorization:'Bearer '+key}}))).status,401);
  redis.values.set('key_owner:'+key,{userId:'owner'});redis.values.set('user_key:owner',key);
  assert.equal((await GET(new Request('https://app.example.test',{headers:{authorization:'Bearer '+key}}))).status,200);
  assert.ok(redis.calls.includes('audit_log:owner'));
  assert.ok(!redis.calls.includes('audit_log'));
  } finally {for(const [i,key] of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'].entries()){if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];}}
});
test('webhook test cannot make a request to a caller-selected server',async()=>{
  const oldFetch=globalThis.fetch;const previous=[process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.example.test';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';
  const destinations=[];globalThis.fetch=async url=>{destinations.push(String(url));return Response.json({id:'owner'});};
  try {
    const {POST}=loadRoute('webhooks',storage());
    const response=await POST(request({action:'test',webhookUrl:'http://127.0.0.1/private'},'valid'));
    assert.equal(response.status,501);
    assert.deepEqual(destinations,['https://auth.example.test/auth/v1/user']);
  } finally {globalThis.fetch=oldFetch;for(const [i,key] of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'].entries()){if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];}}
});

test('proxy refuses provider calls when durable limiting fails',async()=>{
  const saved=[process.env.UPSTASH_REDIS_REST_URL,process.env.UPSTASH_REDIS_REST_TOKEN];
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  const oldFetch=globalThis.fetch;let providerCalls=0;
  globalThis.fetch=async()=>{providerCalls++;throw Error('must not contact provider');};
  try {
    for(const redis of [null,{eval:async()=>{throw Error('offline');}},{eval:async()=>[0,60]}]) {
      const {POST}=loadRoute('proxy',redis);
      const response=await POST(request({provider:'openai',apiKey:'test-provider-key',messages:[{role:'user',content:'hello'}]}));
      assert.equal(response.status,503);
      assert.equal(response.headers.get('cache-control'),'no-store');
    }
    assert.equal(providerCalls,0);
  } finally {globalThis.fetch=oldFetch;for(const [i,key] of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'].entries()){if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];}}
});

test('changing forwarded IP headers does not reset a provider credential budget',async()=>{
  const saved=[process.env.UPSTASH_REDIS_REST_URL,process.env.UPSTASH_REDIS_REST_TOKEN];
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  try {
    const redis=storage();const budgets=new Map();
    redis.eval=async(_script,keys)=>{const count=(budgets.get(keys[0])||0)+1;budgets.set(keys[0],count);return [count,23];};
    redis.get=async()=>({choices:[{message:{content:'cached fixture'}}]});
    const {POST}=loadRoute('proxy',redis);
    for(let i=1;i<=61;i++) {
      const req=new Request('https://app.example.test/api/proxy',{method:'POST',headers:{'x-forwarded-for':'192.0.2.'+i},body:JSON.stringify({provider:'openai',apiKey:'same-test-credential',messages:[{role:'user',content:'hello'}]})});
      const response=await POST(req);
      assert.equal(response.status,i<=60?200:429);
      if(i===61)assert.equal(response.headers.get('retry-after'),'23');
    }
    assert.equal(budgets.size,1);
    assert.ok(![...budgets.keys()][0].includes('same-test-credential'));
  } finally {for(const [i,key] of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'].entries()){if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];}}
});
