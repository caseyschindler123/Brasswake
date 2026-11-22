const { createHash } = require('node:crypto');

async function verifyRelease({ baseURL, expectedCommit, timeoutMs = 90000, intervalMs = 3000, fetchImpl = fetch }) {
  if (!/^https?:\/\//.test(baseURL || '') || !/^[a-f0-9]{40}$/.test(expectedCommit || ''))
    throw new Error('A site URL and full expected commit SHA are required.');
  const base = baseURL.replace(/\/?$/, '/');
  const deadline = Date.now() + timeoutMs;
  let last = 'No release received';
  do {
    try {
      const response = await fetchImpl(new URL('release.json?commit=' + expectedCommit + '&t=' + Date.now(), base), { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('release.json returned HTTP ' + response.status);
      const release = await response.json();
      if (release.commit !== expectedCommit) throw new Error('Expected commit ' + expectedCommit + ', received ' + release.commit);
      const html = await fetchImpl(new URL('index.html?commit=' + expectedCommit, base), { signal: AbortSignal.timeout(15000) });
      if (!html.ok) throw new Error('index.html returned HTTP ' + html.status);
      const actual = createHash('sha256').update(Buffer.from(await html.arrayBuffer())).digest('hex');
      if (actual !== release.htmlSha256) throw new Error('Live HTML hash does not match release.json');
      return { site: base, ...release, verifiedAt: new Date().toISOString() };
    } catch (error) {
      last = error.message;
    }
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs, Math.max(0, deadline - Date.now()))));
  } while (Date.now() <= deadline);
  throw new Error('Live release verification failed: ' + last);
}

module.exports = { verifyRelease };
