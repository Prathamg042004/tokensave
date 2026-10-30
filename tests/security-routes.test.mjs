import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as security from '../app/lib/security.mjs';
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
  const routeName = name;
  const source=fs.readFileSync(new URL('../app/api/'+name+'/route.ts',import.meta.url),'utf8');
  const routeModule={exports:{}};
  const require=name=>name==='next/server'?{NextRequest:Request,NextResponse:Response}:name==='@upstash/redis'?{Redis:class {constructor(){return redis;}}}:name.endsWith('security.mjs')?security:createRequire(new URL('../app/api/'+routeName+'/route.ts',import.meta.url))(name);
  new Function('require','exports','module',compile(source))(require,routeModule.exports,routeModule);
  return routeModule.exports;
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
    redis.get=async()=>({version:1,data:{choices:[{message:{content:'cached fixture'}}]},accounting:{cost:null,usage:null}});
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

test('proxy uses complete provider usage, caches its accounting record, and avoids the original cost on repeat',async()=>{
  const saved=[process.env.UPSTASH_REDIS_REST_URL,process.env.UPSTASH_REDIS_REST_TOKEN];
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  const oldFetch=globalThis.fetch;let calls=0;let sent;
  globalThis.fetch=async(_url,init)=>{calls++;sent=JSON.parse(init.body);return Response.json({model:'gpt-4o-mini-2024-07-18',choices:[{message:{content:'x'.repeat(20000)}}],usage:{prompt_tokens:1000,completion_tokens:10000}});};
  try {
    const redis=storage();redis.setex=async(key,_ttl,value)=>redis.values.set(key,value);
    const {POST}=loadRoute('proxy',redis);
    const code='Please debug this code and preserve all whitespace:\ndef example():\n    return 42';
    const body={provider:'openai',apiKey:'test-provider-key',messages:[{role:'user',content:code}]};
    redis.eval=async()=>[1,60];
    const first=await (await POST(request(body))).json();
    assert.equal(sent.messages[0].content,code);
    assert.equal(first.tokensave_meta.input_tokens,1000);
    assert.equal(first.tokensave_meta.output_tokens,10000);
    assert.equal(first.tokensave_meta.cost,0.00615);
    assert.equal(first.tokensave_meta.savings_percent,null);
    const repeat=await (await POST(request(body))).json();
    assert.equal(calls,1);
    assert.equal(repeat.tokensave_meta.cache_hit,true);
    assert.equal(repeat.tokensave_meta.cost,0);
    assert.equal(repeat.tokensave_meta.cost_saved,first.tokensave_meta.cost);
    assert.equal(repeat.tokensave_meta.tokens_saved,11000);
    assert.equal(repeat.tokensave_meta.input_tokens,0);
  } finally {globalThis.fetch=oldFetch;for(const [i,key] of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'].entries()){if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];}}
});

test('proxy unknown pricing and missing usage stay null; fallback accounting uses the fallback model',async()=>{
  const saved=[process.env.UPSTASH_REDIS_REST_URL,process.env.UPSTASH_REDIS_REST_TOKEN];
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  const oldFetch=globalThis.fetch;
  try {
    const redis=storage();redis.eval=async()=>[1,60];const {POST}=loadRoute('proxy',redis);
    const body={provider:'openai',apiKey:'test-provider-key',messages:[{role:'user',content:'hello'}]};
    for(const data of [{model:'unpriced-model',choices:[{message:{content:'OK'}}],usage:{prompt_tokens:10,completion_tokens:20}},{choices:[{message:{content:'OK'}}]}]) {
      globalThis.fetch=async()=>Response.json(data);
      const response=await POST(request(body));assert.equal(response.status,200);
      assert.equal((await response.json()).tokensave_meta.cost,null);
    }
    let calls=0;
    globalThis.fetch=async()=>++calls===1?Response.json({error:{message:'quota'}},{status:429}):Response.json({model:'claude-haiku-4-5-20251001',content:[{type:'text',text:'hello'}],usage:{input_tokens:100,output_tokens:20}});
    const response=await POST(request({...body,fallbackKeys:{anthropic:'fallback-test-key'}}));
    const meta=(await response.json()).tokensave_meta;
    assert.equal(meta.fallback_provider,'anthropic');assert.equal(meta.cost,0.0002);
    assert.equal(meta.savings_percent,null);
  } finally {globalThis.fetch=oldFetch;for(const [i,key] of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'].entries()){if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];}}
});

test('small charges accumulate as integer nano-USD without disappearing in per-request rounding',async()=>{
  const saved=[process.env.UPSTASH_REDIS_REST_URL,process.env.UPSTASH_REDIS_REST_TOKEN];
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({choices:[{message:{content:'OK'}}],usage:{prompt_tokens:1,completion_tokens:0}});
  try {
    const redis=storage();redis.eval=async()=>[1,60];const increments=[];
    redis.hincrby=async(key,field,value)=>increments.push({key,field,value});
    const {POST}=loadRoute('proxy',redis);
    const response=await POST(request({provider:'openai',apiKey:'test-provider-key',messages:[{role:'user',content:'hi'}]}));
    assert.equal(response.status,200);
    assert.ok(increments.some(row=>row.key.startsWith('billing:v1:') && row.field==='total_cost_nano' && row.value===150));
    assert.ok(!increments.some(row=>row.field.includes('micro')));
  } finally {globalThis.fetch=oldFetch;for(const [i,key] of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'].entries()){if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];}}
});

test('corrupt or invalid cached records are misses rather than request failures',async()=>{
  const saved=[process.env.UPSTASH_REDIS_REST_URL,process.env.UPSTASH_REDIS_REST_TOKEN];
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  const oldFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return Response.json({choices:[{message:{content:'fresh'}}],usage:{prompt_tokens:10,completion_tokens:20}});};
  try {
    for(const cached of ['not json',{version:1,data:{},accounting:{cost:1}},{version:1,data:{choices:[{message:{content:'cached'}}]},accounting:{cost:'999'}}]) {
      const redis=storage();redis.eval=async()=>[1,60];redis.get=async()=>cached;
      const {POST}=loadRoute('proxy',redis);
      const response=await POST(request({provider:'openai',apiKey:'test-provider-key',messages:[{role:'user',content:'hi'}]}));
      assert.equal(response.status,200);
      const data=await response.json();assert.equal(data.tokensave_meta.cache_hit,false);assert.equal(data.choices[0].message.content,'fresh');
    }
    assert.equal(calls,3);
  }finally{globalThis.fetch=oldFetch;for(const [i,key] of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'].entries()){if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];}}
});
