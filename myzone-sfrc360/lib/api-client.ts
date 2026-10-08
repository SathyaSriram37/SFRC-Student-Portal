const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 15000;

type Headers = Record<string, string>;

function buildHeaders(token?: string): Headers {
  const h: Headers = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

export async function apiGet<T = unknown>(path: string, token?: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const r = await fetch(API + path, {
      headers: buildHeaders(token),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'API error' }));
      throw new Error(err.detail || 'API error');
    }
    return r.json() as Promise<T>;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const r = await fetch(API + path, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'API error' }));
      throw new Error(err.detail || 'API error');
    }
    return r.json() as Promise<T>;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export async function apiPut<T = unknown>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const r = await fetch(API + path, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'API error' }));
      throw new Error(err.detail || 'API error');
    }
    return r.json() as Promise<T>;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export async function apiPatch<T = unknown>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const r = await fetch(API + path, {
      method: 'PATCH',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'API error' }));
      throw new Error(err.detail || 'API error');
    }
    return r.json() as Promise<T>;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export async function apiDelete<T = unknown>(path: string, token?: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const r = await fetch(API + path, {
      method: 'DELETE',
      headers: buildHeaders(token),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'API error' }));
      throw new Error(err.detail || 'API error');
    }
    return r.json() as Promise<T>;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}
