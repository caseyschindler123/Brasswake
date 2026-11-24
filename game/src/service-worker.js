/* Opt-in, complete-release offline storage. Player saves never enter these caches. */
'use strict';
const ROOT = self.registration.scope;
const PREFIX = 'brasswake-offline-v1:' + new URL(ROOT).pathname + ':';
const META = PREFIX + 'meta', COMPLETE = new URL('__offline_complete__', ROOT).href;
const key = name => new URL('__offline_' + name, ROOT).href;
const versionOK = v => /^[a-f0-9]{64}$/.test(v || '');
let job = null;
async function read(name) { const r = await (await caches.open(META)).match(key(name)); return r ? r.json() : null; }
async function write(name, value) { await (await caches.open(META)).put(key(name), new Response(JSON.stringify(value), {headers:{'Content-Type':'application/json'}})); }
function validate(m) {
  if (!m || !versionOK(m.version) || !Array.isArray(m.files) || !m.files.length) throw new Error('manifest');
  const urls = new Set(); let bytes = 0;
  for (const f of m.files) {
    if (!/^(index\.html|manifest\.webmanifest|(?:art|vendor)\/[\w./-]+)$/.test(f.url) || f.url.split('/').includes('..') || urls.has(f.url) || !versionOK(f.sha256) || !Number.isSafeInteger(f.bytes) || f.bytes < 0) throw new Error('manifest');
    urls.add(f.url); bytes += f.bytes;
  }
  if (!urls.has('index.html') || !urls.has('vendor/sql-asm.js') || bytes !== m.bytes) throw new Error('manifest');
  return m;
}
async function complete(version) {
  if (!versionOK(version) || !(await caches.has(PREFIX + version))) return null;
  const cache = await caches.open(PREFIX + version), response = await cache.match(COMPLETE);
  if (!response) return null;
  const m = validate(await response.json()), paths = new Set((await cache.keys()).map(r => r.url));
  return m.version === version && m.files.every(f => paths.has(new URL(f.url, ROOT).href)) ? {cache, manifest:m} : null;
}
async function status(version, clientId) {
  if (clientId && versionOK(version)) await write('pin_' + clientId, version);
  const active = await read('active'), copy = await complete(active);
  return {ready:!!copy, version:copy ? active : null, bytes:copy ? copy.manifest.bytes : 0};
}
async function network(url) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
  try { const r = await fetch(url, {cache:'no-store', signal:controller.signal}); if (!r.ok || r.redirected) throw new Error('network'); const body=await r.arrayBuffer(),headers=new Headers(r.headers);headers.delete('Content-Encoding');headers.set('Content-Length',String(body.byteLength));return new Response(body,{status:r.status,headers}); }
  finally { clearTimeout(timer); }
}
async function manifest() { return validate(await (await network(new URL('offline-manifest.json', ROOT).href)).json()); }
async function digest(buffer) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function cleanup(previous) {
  const keep = new Set([await read('active'), previous]);
  const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true}), live=new Set();
  for (const client of clients) {live.add(key('pin_' + client.id));keep.add(await read('pin_' + client.id));}
  const meta=await caches.open(META);
  for(const request of await meta.keys())if(request.url.startsWith(key('pin_'))&&!live.has(request.url))await meta.delete(request);
  for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== META && !keep.has(name.slice(PREFIX.length))) await caches.delete(name);
}
async function download(send) {
  const m = await manifest(), previous = await read('active'), cache = await caches.open(PREFIX + m.version);
  let bytes = 0, count = 0, next = 0;
  send({type:'progress', bytes, total:m.bytes, count, files:m.files.length});
  /* Bounded concurrency; only verified full responses are retained, also on retry. */
  let failure;
  await Promise.all(Array.from({length:3}, async () => {
    while (next < m.files.length && !failure) {
      const f = m.files[next++], url = new URL(f.url, ROOT).href;
      try {
        let old = await cache.match(url);
        if(old){const body=await old.clone().arrayBuffer();if(body.byteLength!==f.bytes||await digest(body)!==f.sha256){await cache.delete(url);old=null;}}
        if(!old){const r=await network(url),body=await r.clone().arrayBuffer();if(body.byteLength!==f.bytes||await digest(body)!==f.sha256)throw new Error('integrity');await cache.put(url,r);}
        bytes += f.bytes; count++; send({type:'progress', bytes, total:m.bytes, count, files:m.files.length});
      } catch (e) { failure = e; }
    }
  }));
  if (failure) throw failure;
  await cache.put(COMPLETE, new Response(JSON.stringify(m), {headers:{'Content-Type':'application/json'}}));
  if (!await complete(m.version)) throw new Error('storage');
  /* A single pointer changes only after the entire release is stored. */
  await write('active', m.version);
  await cleanup(previous).catch(()=>{});
  return {type:'done', ready:true, version:m.version, bytes:m.bytes};
}
self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('message', e => {
  const data=e.data || {}, port=e.ports[0];
  if (!port || !e.source || !e.source.url.startsWith(ROOT)) return;
  const send = value => { try { port.postMessage(value); } catch (_) {} };
  e.waitUntil((async () => {
    try {
      if (data.type === 'status') return send({type:'done', ...await status(data.version, e.source.id)});
      if (data.type !== 'download') return;
      if (versionOK(data.version)) await write('pin_' + e.source.id, data.version);
      if (!job) {
        const listeners = new Set();
        job = {listeners};
        job.promise = download(value => { for (const fn of listeners) fn(value); }).finally(() => {job=null;});
      }
      const current=job; current.listeners.add(send);
      try { send(await current.promise); } finally { current.listeners.delete(send); }
    } catch (error) { send({type:'error', error:error.name === 'QuotaExceededError' ? 'quota' : error.message === 'integrity' ? 'integrity' : 'download'}); }
  })());
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url), base = new URL(ROOT);
  if (e.request.method !== 'GET' || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  const relative = url.pathname.slice(base.pathname.length), navigation = e.request.mode === 'navigate' && (relative === '' || relative === 'index.html');
  if (!navigation && !/^(art|vendor)\//.test(relative) && relative !== 'manifest.webmanifest') return;
  /* Local diagnostic fixtures must keep their normal server responses. */
  if (url.searchParams.has('visual_test')) return;
  e.respondWith((async () => {
    try {
      if (navigation) {
        const version=await read('active'), copy=await complete(version);
        if (copy) {
          if (e.resultingClientId) await write('pin_' + e.resultingClientId, version);
          return await copy.cache.match(new URL('index.html', ROOT).href);
        }
      } else {
        const pin = e.clientId && await read('pin_' + e.clientId);
        const version = pin || await read('active');
        if (versionOK(version)) {
          const cache=await caches.open(PREFIX + version), response=await cache.match(new URL(relative, ROOT).href);
          if (response) return response;
        }
      }
    } catch (_) { /* Storage access can fail even when the network is available. */ }
    return fetch(e.request);
  })());
});
