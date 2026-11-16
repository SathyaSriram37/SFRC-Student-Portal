import { createClient } from './supabase/client';

const DEFAULT_TIMEOUT_MS = 15000;

function getFullUrl(path: string): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const base = raw.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api/v1') && cleanPath.startsWith('/api/v1')) {
    return `${base}${cleanPath.substring(7)}`;
  }
  return `${base}${cleanPath}`;
}

async function fetchWithFallback(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (url.includes('//localhost:8000')) {
      const fallbackUrl = url.replace('//localhost:8000', '//127.0.0.1:8000');
      try {
        return await fetch(fallbackUrl, init);
      } catch {
        throw err;
      }
    } else if (url.includes('//127.0.0.1:8000')) {
      const fallbackUrl = url.replace('//127.0.0.1:8000', '//localhost:8000');
      try {
        return await fetch(fallbackUrl, init);
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

type Headers = Record<string, string>;

function buildHeaders(token?: string): Headers {
  const h: Headers = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

async function resolveToken(token?: string): Promise<string | undefined> {
  if (token) return token;
  if (typeof window !== 'undefined') {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) return data.session.access_token;

      // Fallback check in localStorage if getSession() is still hydrating
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase')) && key.endsWith('-auth-token')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.access_token) return parsed.access_token;
              if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
            }
          } catch {}
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function apiGet<T = unknown>(path: string, token?: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const authToken = await resolveToken(token);
    const r = await fetchWithFallback(getFullUrl(path), {
      headers: buildHeaders(authToken),
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
    const authToken = await resolveToken(token);
    const r = await fetchWithFallback(getFullUrl(path), {
      method: 'POST',
      headers: buildHeaders(authToken),
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
    const authToken = await resolveToken(token);
    const r = await fetchWithFallback(getFullUrl(path), {
      method: 'PUT',
      headers: buildHeaders(authToken),
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
    const authToken = await resolveToken(token);
    const r = await fetchWithFallback(getFullUrl(path), {
      method: 'PATCH',
      headers: buildHeaders(authToken),
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
    const authToken = await resolveToken(token);
    const r = await fetchWithFallback(getFullUrl(path), {
      method: 'DELETE',
      headers: buildHeaders(authToken),
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
