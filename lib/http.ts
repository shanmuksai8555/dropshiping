import 'server-only';
import { NextResponse } from 'next/server';

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export const notConfigured = (what: string, missing: string[]) =>
  json({ ok: false, code: 'not_configured', message: `${what} is not configured on this server.`, missing }, 503);

/** Reads a JSON body with a size cap. Returns null on bad JSON / oversize. */
export async function readJson(req: Request, maxBytes = 16_384): Promise<unknown | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Same-origin check for browser-facing POST routes (defence in depth against CSRF-style posts). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients (curl) don't send Origin
  try {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
