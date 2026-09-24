'use strict';

class ProviderError extends Error {
  constructor(provider, status, body) {
    super(`${provider} API error ${status}: ${String(body).slice(0, 300)}`);
    this.provider = provider;
    this.httpStatus = status;
    this.body = body;
  }
}

async function request(provider, url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new ProviderError(provider, res.status, text);
  return data;
}

/** Provider amount (number or "123.45" string) → integer halalas. */
const halalas = (v) => Math.round(Number(v) * 100);

module.exports = { request, ProviderError, halalas };
